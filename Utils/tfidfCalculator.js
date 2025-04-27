const natural = require('natural');
const { TfIdf } = natural;
const STOP_WORDS = new Set(['and', 'the', 'with', 'for', 'using', 'based']);

// Fonction pour extraire dynamiquement toutes les compétences des utilisateurs
function extractAllSkills(users) {
  const allSkills = new Set();
  users.forEach(user => {
    (user.skills || []).forEach(skill => {
      if (typeof skill === 'string') {
        const normalized = skill.toLowerCase().trim();
        if (normalized.length > 2) {
          allSkills.add(normalized);
        }
      }
    });
  });
  return Array.from(allSkills);
}

// Normalisation améliorée du texte avec gestion des alias
function normalizeText(text) {
  if (!text) return '';
  
  const aliases = {
    'reactjs': 'react',
    'typescript': 'typescript',
    'pyspark': 'spark',
    'js': 'javascript',
    'ml': 'machine learning',
    'ai': 'artificial intelligence'
  };

  return text.toLowerCase()
    .split(/[\s+|_|\.|,|-]+/)
    .map(word => word.replace(/[^\w]/g, ''))
    .filter(word => word.length > 2)
    .map(word => aliases[word] || word)
    .join(' ');
}

// Amélioration du contenu texte avec pondération
function enhanceTextContent(textParts) {
  return textParts
    .filter(Boolean)
    .map(part => {
      const words = part.split(' ');
      const enhancedWords = words.map(word => 
        word.length >= 5 ? `${word} ${word}` : word
      );
      return enhancedWords.join(' ');
    })
    .join(' ');
}

// Fonction principale d'affectation
async function assignSubjects(groups, users, subjects, threshold = 0.15, maxGroups = 3) {
  try {
    const TECH_SKILLS = extractAllSkills(users);
    const usersMap = createUsersMap(users);
    const allAssignments = await calculateTFIDF(groups, subjects, usersMap, TECH_SKILLS);
    
    const filteredAssignments = filterAndLimitAssignments(
      allAssignments, 
      threshold, 
      maxGroups, 
      groups, 
      usersMap
    );

    return {
      matches: formatAssignments(filteredAssignments),
      message: filteredAssignments.length === 0 
        ? `0 correspondance(s) trouvée(s) - Seuil: ${threshold}`
        : `${filteredAssignments.length} correspondance(s) trouvée(s) - Seuil: ${threshold}`
    };

  } catch (error) {
    console.error('Erreur dans assignSubjects:', error);
    return {
      matches: [],
      message: 'Erreur lors du traitement'
    };
  }
}

// Fonctions helper
function createUsersMap(users) {
  return users.reduce((acc, user) => {
    acc[user._id.toString()] = {
      ...user.toObject ? user.toObject() : user,
      skills: (user.skills || []).map(skill => skill.toLowerCase())
    };
    return acc;
  }, {});
}

async function calculateTFIDF(groups, subjects, usersMap, TECH_SKILLS) {
  const tfidf = new TfIdf();
  const assignments = [];

  // Préparation des documents
  const groupDocs = groups.map(group => {
    const membersSkills = group.members.flatMap(member => {
      const memberId = member._id ? member._id.toString() : member.toString();
      return usersMap[memberId]?.skills || [];
    });
    return normalizeText([group.name, ...membersSkills].join(' '));
  });

  const subjectDocs = subjects.map(subject => {
    const textParts = [
      subject.title,
      subject.description || '',
      ...(subject.keyFeatures || []).flatMap(f => [f?.title || '', f?.description || '']),
      ...(subject.aiFunctionalities || []).flatMap(f => [f?.title || '', f?.description || ''])
    ];
    return normalizeText(enhanceTextContent(textParts));
  });

  // Ajout des documents
  [...subjectDocs, ...groupDocs].forEach(doc => tfidf.addDocument(doc));

  // Calcul des scores
  subjects.forEach((subject, sIdx) => {
    groups.forEach((group, gIdx) => {
      let score = 0;
      const subjectTerms = subjectDocs[sIdx] ? new Set(subjectDocs[sIdx].split(' ')) : new Set();
      
      if (subjectDocs[sIdx]) {
        tfidf.tfidfs(subjectDocs[sIdx], (i, measure) => {
          if (i === subjectDocs.length + gIdx) {
            score += measure > 0 ? 1 + Math.log1p(measure) : 0;
          }
        });
      }

      const matchedSkills = getCommonSkills(subject, group, TECH_SKILLS, usersMap);
      const skillBoost = matchedSkills.length * 0.1;
      const normalizedScore = subjectTerms.size > 0 
        ? Math.min(1, Math.max(0, (score * (1 + skillBoost)) / (subjectTerms.size * 1.2)))
        : 0;

      assignments.push({
        subjectId: subject._id.toString(),
        groupId: group._id.toString(),
        score: parseFloat(normalizedScore.toFixed(2)),
        subjectTitle: subject.title,
        groupName: group.name,
        matchedSkills,
        rawScore: score
      });
    });
  });

  return assignments;
}

function getCommonSkills(subject, group, TECH_SKILLS, usersMap) {
  const subjectText = [
    subject.title,
    subject.description || '',
    ...(subject.keyFeatures || []).flatMap(f => [f?.title || '', f?.description || '']),
    ...(subject.aiFunctionalities || []).flatMap(f => [f?.title || '', f?.description || ''])
  ].join(' ').toLowerCase();

  const groupSkills = new Set();
  group.members.forEach(member => {
    const memberId = member._id ? member._id.toString() : member.toString();
    (usersMap[memberId]?.skills || []).forEach(skill => {
      groupSkills.add(skill.toLowerCase());
    });
  });

  return TECH_SKILLS.filter(skill => 
    skill && 
    subjectText.includes(skill.toLowerCase()) && 
    groupSkills.has(skill.toLowerCase())
  );
}

function filterAndLimitAssignments(assignments, threshold, maxGroups, groups, usersMap) {
  return assignments
    .filter(assignment => assignment.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .reduce((acc, curr) => {
      const existingSubjectGroups = acc.filter(a => a.subjectId === curr.subjectId).length;
      const existingGroupSubjects = acc.filter(a => a.groupId === curr.groupId).length;
      
      if (existingSubjectGroups < maxGroups && existingGroupSubjects === 0) {
        const group = groups.find(g => g._id.toString() === curr.groupId);
        curr.memberNames = group?.members?.map(m => {
          const memberId = m._id ? m._id.toString() : m.toString();
          return usersMap[memberId]?.name || 'Inconnu';
        }) || [];
        acc.push(curr);
      }
      return acc;
    }, []);
}

function formatAssignments(assignments) {
  return assignments.map(assignment => ({
    subjectId: assignment.subjectId,
    subjectTitle: assignment.subjectTitle,
    groupId: assignment.groupId,
    groupName: assignment.groupName,
    score: assignment.score,
    skills: assignment.matchedSkills,
    members: assignment.memberNames,
    rawScore: assignment.rawScore
  }));
}

module.exports = {
  assignSubjects,
  normalizeText,
  extractAllSkills
};
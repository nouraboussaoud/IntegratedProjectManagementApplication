const natural = require('natural');
const User = require('../models/User');
const Project = require('../models/Project');
const Group = require('../models/Group');
const Task = require('../models/Task');
const Deliverable = require('../models/Deliverable');

// TF-IDF for content-based matching
const TfIdf = natural.TfIdf;

/**
 * Recommends projects to students based on multiple factors:
 * - Learning style preferences
 * - Past project performance
 * - Collaboration patterns
 * - Project complexity alignment
 * - Time availability
 */
const recommendProjects = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user data
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Get all available projects
    const projects = await Project.find({ status: 'active' });
    if (projects.length === 0) {
      return res.status(200).json({ 
        message: "No active projects available for recommendation",
        recommendations: [] 
      });
    }
    
    // Get user's past performance data
    const userTasks = await Task.find({ assignedTo: userId });
    const userDeliverables = await Deliverable.find({ student_id: userId });
    
    // Calculate user's performance metrics
    const performanceMetrics = calculatePerformanceMetrics(userTasks, userDeliverables);
    
    // Calculate project complexity scores
    const projectComplexityScores = calculateProjectComplexityScores(projects);
    
    // Calculate match scores based on multiple factors
    const scores = [];
    
    for (const project of projects) {
      // 1. Calculate learning style compatibility (would come from user profile)
      const learningStyleScore = calculateLearningStyleCompatibility(
        user.learningPreferences || {}, // This would be a new field in User model
        project.learningApproach || {}  // This would be a new field in Project model
      );
      
      // 2. Calculate project complexity alignment with user performance
      const complexityAlignmentScore = calculateComplexityAlignment(
        performanceMetrics,
        projectComplexityScores[project._id.toString()]
      );
      
      // 3. Calculate collaboration pattern match
      const collaborationScore = calculateCollaborationMatch(
        user.collaborationStyle || {}, // This would be a new field in User model
        project.teamworkRequirements || {} // This would be a new field in Project model
      );
      
      // 4. Calculate time commitment alignment
      const timeCommitmentScore = calculateTimeCommitmentMatch(
        user.availableHoursPerWeek || 10, // This would be a new field in User model
        project.estimatedHoursPerWeek || 10 // This would be a new field in Project model
      );
      
      // 5. Calculate interest alignment using TF-IDF
      const interestScore = calculateInterestAlignment(user, project);
      
      // Calculate weighted final score
      const finalScore = (
        learningStyleScore * 0.25 +
        complexityAlignmentScore * 0.2 +
        collaborationScore * 0.2 +
        timeCommitmentScore * 0.15 +
        interestScore * 0.2
      );
      
      scores.push({
        project,
        finalScore,
        factors: {
          learningStyleScore,
          complexityAlignmentScore,
          collaborationScore,
          timeCommitmentScore,
          interestScore
        }
      });
    }
    
    // Sort by final score (descending)
    scores.sort((a, b) => b.finalScore - a.finalScore);
    
    // Get top 5 recommendations
    const recommendations = scores.slice(0, 5).map(item => ({
      projectId: item.project._id,
      title: item.project.title,
      description: item.project.description,
      matchScore: Math.min(100, Math.round(item.finalScore * 100)), // Normalize to 0-100%
      matchFactors: {
        learningStyle: Math.round(item.factors.learningStyleScore * 100),
        complexityFit: Math.round(item.factors.complexityAlignmentScore * 100),
        collaborationFit: Math.round(item.factors.collaborationScore * 100),
        timeCommitment: Math.round(item.factors.timeCommitmentScore * 100),
        interestAlignment: Math.round(item.factors.interestScore * 100)
      }
    }));
    
    return res.status(200).json({
      message: "Project recommendations generated successfully",
      recommendations
    });
    
  } catch (error) {
    console.error("Error generating project recommendations:", error);
    return res.status(500).json({ 
      message: "Error generating project recommendations", 
      error: error.message 
    });
  }
};

/**
 * Suggests optimal team formations based on complementary factors:
 * - Diverse learning styles
 * - Complementary work patterns
 * - Schedule compatibility
 * - Past collaboration success
 * - Balanced experience levels
 */
const suggestTeamFormations = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { maxTeamSize = 4, minTeamSize = 2 } = req.body;
    
    // Get project data
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    
    // Get all students
    const students = await User.find({ role: 'student', isActive: true });
    if (students.length < minTeamSize) {
      return res.status(400).json({ 
        message: "Not enough active students for team formation" 
      });
    }
    
    // Get performance data for all students
    const studentIds = students.map(student => student._id);
    const tasks = await Task.find({ assignedTo: { $in: studentIds } });
    const deliverables = await Deliverable.find({ student_id: { $in: studentIds } });
    
    // Calculate student profiles with multiple factors
    const studentProfiles = await Promise.all(students.map(async (student) => {
      // Get student's tasks and deliverables
      const studentTasks = tasks.filter(task => 
        task.assignedTo.toString() === student._id.toString()
      );
      const studentDeliverables = deliverables.filter(deliverable => 
        deliverable.student_id.toString() === student._id.toString()
      );
      
      // Calculate performance metrics
      const performanceMetrics = calculatePerformanceMetrics(studentTasks, studentDeliverables);
      
      // Get collaboration history
      const collaborationHistory = await getCollaborationHistory(student._id);
      
      return {
        student: {
          id: student._id,
          name: student.name,
          email: student.email
        },
        skills: student.skills || [],
        learningStyle: student.learningPreferences || {
          visual: Math.random(), // Placeholder - would come from user profile
          auditory: Math.random(),
          kinesthetic: Math.random(),
          reading: Math.random()
        },
        workPattern: {
          earlyStarter: Math.random() > 0.5, // Placeholder - would come from user profile
          consistentWorker: Math.random() > 0.5,
          deadlineRusher: Math.random() > 0.5
        },
        availability: {
          mornings: Math.random() > 0.5, // Placeholder - would come from user profile
          afternoons: Math.random() > 0.5,
          evenings: Math.random() > 0.5,
          weekends: Math.random() > 0.5
        },
        performanceMetrics,
        collaborationHistory,
        experienceLevel: calculateExperienceLevel(performanceMetrics, studentTasks.length)
      };
    }));
    
    // Calculate optimal number of teams
    const numStudents = students.length;
    const optimalTeamCount = Math.ceil(numStudents / maxTeamSize);
    
    // Initialize teams
    const teams = Array(optimalTeamCount).fill().map(() => ({
      members: [],
      learningStyles: {
        visual: 0,
        auditory: 0,
        kinesthetic: 0,
        reading: 0
      },
      workPatterns: {
        earlyStarters: 0,
        consistentWorkers: 0,
        deadlineRushers: 0
      },
      availability: {
        mornings: 0,
        afternoons: 0,
        evenings: 0,
        weekends: 0
      },
      experienceLevels: {
        beginner: 0,
        intermediate: 0,
        advanced: 0
      },
      averagePerformance: 0,
      collaborationScore: 0
    }));
    
    // First, distribute students with diverse learning styles
    const learningStyleCategories = ['visual', 'auditory', 'kinesthetic', 'reading'];
    
    learningStyleCategories.forEach(styleCategory => {
      // Sort students by this learning style preference (descending)
      const sortedByStyle = [...studentProfiles]
        .filter(profile => !profile.assigned)
        .sort((a, b) => 
          (b.learningStyle[styleCategory] || 0) - (a.learningStyle[styleCategory] || 0)
        );
      
      // Assign top students for this style to different teams
      for (let i = 0; i < Math.min(teams.length, sortedByStyle.length); i++) {
        const student = sortedByStyle[i];
        
        // Find team with lowest representation of this learning style
        let targetTeam = 0;
        let minStyleValue = teams[0].learningStyles[styleCategory];
        
        for (let j = 1; j < teams.length; j++) {
          if (teams[j].members.length < maxTeamSize && 
              teams[j].learningStyles[styleCategory] < minStyleValue) {
            targetTeam = j;
            minStyleValue = teams[j].learningStyles[styleCategory];
          }
        }
        
        // Add student to team
        teams[targetTeam].members.push(student.student);
        
        // Update team metrics
        updateTeamMetrics(teams[targetTeam], student);
        
        // Mark student as assigned
        student.assigned = true;
      }
    });
    
    // Next, distribute students with diverse work patterns
    const workPatternTypes = ['earlyStarter', 'consistentWorker', 'deadlineRusher'];
    
    workPatternTypes.forEach(patternType => {
      // Sort unassigned students by this work pattern (true first)
      const sortedByPattern = [...studentProfiles]
        .filter(profile => !profile.assigned)
        .sort((a, b) => {
          if (a.workPattern[patternType] && !b.workPattern[patternType]) return -1;
          if (!a.workPattern[patternType] && b.workPattern[patternType]) return 1;
          return 0;
        });
      
      // Assign students with this pattern to teams that need it
      for (let i = 0; i < sortedByPattern.length; i++) {
        const student = sortedByPattern[i];
        
        // Find team with lowest representation of this work pattern
        let targetTeam = 0;
        let minPatternValue = teams[0].workPatterns[patternType + 's']; // pluralize
        
        for (let j = 1; j < teams.length; j++) {
          if (teams[j].members.length < maxTeamSize && 
              teams[j].workPatterns[patternType + 's'] < minPatternValue) {
            targetTeam = j;
            minPatternValue = teams[j].workPatterns[patternType + 's'];
          }
        }
        
        // Add student to team
        teams[targetTeam].members.push(student.student);
        
        // Update team metrics
        updateTeamMetrics(teams[targetTeam], student);
        
        // Mark student as assigned
        student.assigned = true;
      }
    });
    
    // Finally, distribute remaining students to balance experience levels
    studentProfiles
      .filter(profile => !profile.assigned)
      .forEach(student => {
        // Find team with lowest average performance that isn't full
        let targetTeam = 0;
        let minPerformance = Number.MAX_VALUE;
        
        for (let j = 0; j < teams.length; j++) {
          if (teams[j].members.length < maxTeamSize && teams[j].averagePerformance < minPerformance) {
            targetTeam = j;
            minPerformance = teams[j].averagePerformance;
          }
        }
        
        // Add student to team
        teams[targetTeam].members.push(student.student);
        
        // Update team metrics
        updateTeamMetrics(teams[targetTeam], student);
      });
    
    // Format response
    const formattedTeams = teams.map((team, index) => ({
      teamNumber: index + 1,
      members: team.members,
      teamDynamics: {
        learningStyleDiversity: calculateDiversity(team.learningStyles),
        workPatternBalance: calculateWorkPatternBalance(team.workPatterns),
        availabilityCoverage: calculateAvailabilityCoverage(team.availability),
        experienceMix: calculateExperienceMix(team.experienceLevels),
        overallCompatibility: calculateOverallCompatibility(team)
      }
    }));
    
    return res.status(200).json({
      message: "Team formation suggestions generated successfully",
      suggestedTeams: formattedTeams
    });
    
  } catch (error) {
    console.error("Error generating team suggestions:", error);
    return res.status(500).json({ 
      message: "Error generating team suggestions", 
      error: error.message 
    });
  }
};

// Helper functions

function calculatePerformanceMetrics(tasks, deliverables) {
  // Calculate metrics based on task completion and deliverable quality
  const completedTasks = tasks.filter(task => task.status === 'completed');
  const onTimeTasks = completedTasks.filter(task => 
    !task.deadline || new Date(task.completedOn) <= new Date(task.deadline)
  );
  
  const evaluatedDeliverables = deliverables.filter(d => 
    d.evaluation && d.evaluation.evaluationScore !== undefined
  );
  
  return {
    taskCompletionRate: tasks.length > 0 ? completedTasks.length / tasks.length : 0,
    onTimeCompletionRate: completedTasks.length > 0 ? onTimeTasks.length / completedTasks.length : 0,
    averageTaskProgress: tasks.length > 0 
      ? tasks.reduce((sum, task) => sum + (task.progressPercentage || 0), 0) / tasks.length 
      : 0,
    averageDeliverableScore: evaluatedDeliverables.length > 0
      ? evaluatedDeliverables.reduce((sum, d) => sum + d.evaluation.evaluationScore, 0) / evaluatedDeliverables.length
      : 0,
    revisionsRate: tasks.length > 0
      ? tasks.reduce((sum, task) => sum + (task.revisions || 0), 0) / tasks.length
      : 0
  };
}

function calculateProjectComplexityScores(projects) {
  // Calculate complexity scores for each project
  const scores = {};
  
  projects.forEach(project => {
    // Factors that contribute to complexity
    const descriptionLength = (project.description || '').length;
    const requirementsCount = (project.requirements || '').split(/[.,;!?]/).filter(s => s.trim().length > 0).length;
    const technologiesCount = (project.technologies || []).length;
    
    // Calculate normalized complexity score (0-1)
    const complexityScore = Math.min(1, (
      (descriptionLength / 1000) * 0.3 +
      (requirementsCount / 10) * 0.4 +
      (technologiesCount / 5) * 0.3
    ));
    
    scores[project._id.toString()] = complexityScore;
  });
  
  return scores;
}

function calculateLearningStyleCompatibility(userPreferences, projectApproach) {
  // Default values if not specified
  const defaultUserPrefs = {
    visual: 0.25,
    auditory: 0.25,
    kinesthetic: 0.25,
    reading: 0.25
  };
  
  const defaultProjectApproach = {
    visual: 0.25,
    auditory: 0.25,
    kinesthetic: 0.25,
    reading: 0.25
  };
  
  const userPrefs = { ...defaultUserPrefs, ...userPreferences };
  const projectAppr = { ...defaultProjectApproach, ...projectApproach };
  
  // Calculate dot product as compatibility score
  let dotProduct = 0;
  for (const style in userPrefs) {
    dotProduct += (userPrefs[style] || 0) * (projectAppr[style] || 0);
  }
  
  return dotProduct;
}

function calculateComplexityAlignment(performanceMetrics, projectComplexity) {
  // Calculate user's performance score (0-1)
  const performanceScore = (
    performanceMetrics.taskCompletionRate * 0.3 +
    performanceMetrics.onTimeCompletionRate * 0.3 +
    (performanceMetrics.averageDeliverableScore / 100) * 0.4
  );
  
  // Calculate alignment score
  // Higher performance users get better alignment with complex projects
  // Lower performance users get better alignment with simpler projects
  const alignmentScore = 1 - Math.abs(performanceScore - projectComplexity);
  
  return alignmentScore;
}

function calculateCollaborationMatch(userStyle, projectRequirements) {
  // Default values if not specified
  const defaultUserStyle = {
    leadership: 0.5,
    communication: 0.5,
    independence: 0.5,
    teamOrientation: 0.5
  };
  
  const defaultProjectReqs = {
    leadership: 0.5,
    communication: 0.5,
    independence: 0.5,
    teamOrientation: 0.5
  };
  
  const userCollab = { ...defaultUserStyle, ...userStyle };
  const projectCollab = { ...defaultProjectReqs, ...projectRequirements };
  
  // Calculate similarity score
  let similarity = 0;
  let count = 0;
  
  for (const aspect in userCollab) {
    if (projectCollab[aspect] !== undefined) {
      similarity += 1 - Math.abs(userCollab[aspect] - projectCollab[aspect]);
      count++;
    }
  }
  
  return count > 0 ? similarity / count : 0.5;
}

function calculateTimeCommitmentMatch(userHours, projectHours) {
  // Calculate how well user's available time matches project requirements
  // 1.0 = perfect match, 0.0 = completely mismatched
  
  if (userHours >= projectHours) {
    // User has enough time
    return 1.0;
  } else {
    // User has less time than needed
    return userHours / projectHours;
  }
}

function calculateInterestAlignment(user, project) {
  // Calculate interest alignment using TF-IDF
  const tfidf = new TfIdf();
  
  // Add user profile as the first document
  tfidf.addDocument(user.interests.join(' '));
  
  // Add project title and description as the second document
  const projectContent = [
    project.title,
    project.description
  ].join(' ');
  
  tfidf.addDocument(projectContent);
  
  let interestScore = 0;
  tfidf.tfidfs(user.interests.join(' '), (i, measure) => {
    if (i === 1) {
      interestScore = measure;
    }
  });
  
  return interestScore;
}

function calculateExperienceLevel(performanceMetrics, taskCount) {
  // Calculate experience level based on performance metrics and task count
  const { taskCompletionRate, onTimeCompletionRate, averageTaskProgress, averageDeliverableScore } = performanceMetrics;
  
  const baseExperience = taskCount > 0 ? 1 : 0;
  const performanceBonus = (
    (taskCompletionRate * 0.3) +
    (onTimeCompletionRate * 0.3) +
    (averageTaskProgress * 0.2) +
    (averageDeliverableScore * 0.2)
  );
  
  return baseExperience + performanceBonus;
}

function getCollaborationHistory(userId) {
  // This function would fetch collaboration history for a user
  // For now, we'll return a placeholder
  return Promise.resolve({
    successRate: 0.8, // Placeholder value
    teamSuccessRate: 0.9 // Placeholder value
  });
}

function updateTeamMetrics(team, student) {
  // Update team metrics based on the new student
  team.learningStyles.visual += student.learningStyle.visual;
  team.learningStyles.auditory += student.learningStyle.auditory;
  team.learningStyles.kinesthetic += student.learningStyle.kinesthetic;
  team.learningStyles.reading += student.learningStyle.reading;
  
  team.workPatterns.earlyStarters += student.workPattern.earlyStarter ? 1 : 0;
  team.workPatterns.consistentWorkers += student.workPattern.consistentWorker ? 1 : 0;
  team.workPatterns.deadlineRushers += student.workPattern.deadlineRusher ? 1 : 0;
  
  team.availability.mornings += student.availability.mornings ? 1 : 0;
  team.availability.afternoons += student.availability.afternoons ? 1 : 0;
  team.availability.evenings += student.availability.evenings ? 1 : 0;
  team.availability.weekends += student.availability.weekends ? 1 : 0;
  
  team.experienceLevels.beginner += student.experienceLevel < 1 ? 1 : 0;
  team.experienceLevels.intermediate += student.experienceLevel >= 1 && student.experienceLevel < 2 ? 1 : 0;
  team.experienceLevels.advanced += student.experienceLevel >= 2 ? 1 : 0;
  
  team.averagePerformance = team.members.length > 0
    ? (team.averagePerformance * (team.members.length - 1) + student.performanceMetrics.averageDeliverableScore) / team.members.length
    : student.performanceMetrics.averageDeliverableScore;
  
  team.collaborationScore = team.members.length > 0
    ? (team.collaborationScore * (team.members.length - 1) + student.collaborationHistory.successRate) / team.members.length
    : student.collaborationHistory.successRate;
}

function calculateDiversity(learningStyles) {
  const total = Object.values(learningStyles).reduce((sum, value) => sum + value, 0);
  const diversity = Object.values(learningStyles).reduce((sum, value) => sum + (value / total) ** 2, 0);
  return 1 - diversity;
}

function calculateWorkPatternBalance(workPatterns) {
  const total = Object.values(workPatterns).reduce((sum, value) => sum + value, 0);
  const balance = Object.values(workPatterns).reduce((sum, value) => sum + (value / total) ** 2, 0);
  return 1 - balance;
}

function calculateAvailabilityCoverage(availability) {
  const total = Object.values(availability).reduce((sum, value) => sum + value, 0);
  return total / 4; // Assuming 4 time slots (mornings, afternoons, evenings, weekends)
}

function calculateExperienceMix(experienceLevels) {
  const total = Object.values(experienceLevels).reduce((sum, value) => sum + value, 0);
  const mix = Object.values(experienceLevels).reduce((sum, value) => sum + (value / total) ** 2, 0);
  return 1 - mix;
}

function calculateOverallCompatibility(team) {
  const learningStyleDiversity = calculateDiversity(team.learningStyles);
  const workPatternBalance = calculateWorkPatternBalance(team.workPatterns);
  const availabilityCoverage = calculateAvailabilityCoverage(team.availability);
  const experienceMix = calculateExperienceMix(team.experienceLevels);
  const collaborationScore = team.collaborationScore;
  
  return (
    (learningStyleDiversity * 0.3) +
    (workPatternBalance * 0.2) +
    (availabilityCoverage * 0.2) +
    (experienceMix * 0.1) +
    (collaborationScore * 0.2)
  );
}

module.exports = {
  recommendProjects,
  suggestTeamFormations
};

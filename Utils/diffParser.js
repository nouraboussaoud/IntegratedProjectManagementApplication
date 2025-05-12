/**
 * Parses Git diff output to extract meaningful code changes
 */
function parseCodeDiff(diff) {
  const parsedChanges = [];
  try {
    const lines = diff.split("\n");
    let currentFile = '';
    let inHunk = false;
    let codeBlock = { type: '', code: [], file: '' };
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Track which file we're in
      if (line.startsWith('diff --git')) {
        currentFile = line.split(' ')[2].substring(2);
        console.log('Found file in diff:', currentFile);
        continue;
      }
      
      // Skip non-code files
      if (!isCodeFile(currentFile)) {
        continue;
      }
      
      // Start of a diff hunk
      if (line.startsWith('@@')) {
        if (inHunk && codeBlock.code.length > 0) {
          parsedChanges.push({
            type: codeBlock.type,
            code: codeBlock.code.join('\n'),
            file: codeBlock.file
          });
        }
        
        inHunk = true;
        codeBlock = { type: '', code: [], file: currentFile };
        continue;
      }
      
      // Process added/removed lines
      if (inHunk) {
        if (line.startsWith('+') && !line.startsWith('+++')) {
          const code = line.substring(1);
          
          if (code.trim() && !isTrivialChange(code)) {
            if (codeBlock.type === 'removed' && codeBlock.code.length > 0) {
              parsedChanges.push({
                type: 'removed',
                code: codeBlock.code.join('\n'),
                file: currentFile
              });
              codeBlock.code = [];
            }
            
            codeBlock.type = 'added';
            codeBlock.file = currentFile;
            codeBlock.code.push(code);
          }
        } 
        else if (line.startsWith('-') && !line.startsWith('---')) {
          const code = line.substring(1);
          
          if (code.trim() && !isTrivialChange(code)) {
            if (codeBlock.type === 'added' && codeBlock.code.length > 0) {
              parsedChanges.push({
                type: 'added',
                code: codeBlock.code.join('\n'),
                file: currentFile
              });
              codeBlock.code = [];
            }
            
            codeBlock.type = 'removed';
            codeBlock.file = currentFile;
            codeBlock.code.push(code);
          }
        }
        else if (codeBlock.code.length > 0) {
          parsedChanges.push({
            type: codeBlock.type,
            code: codeBlock.code.join('\n'),
            file: currentFile
          });
          codeBlock.code = [];
        }
      }
    }
    
    if (codeBlock.code.length > 0) {
      parsedChanges.push({
        type: codeBlock.type,
        code: codeBlock.code.join('\n'),
        file: codeBlock.file
      });
    }
    
    const consolidated = consolidateChanges(parsedChanges);
    console.log(`Parsed ${consolidated.length} code changes from diff`);
    return consolidated.filter(change => 
      change.code.length > 20 && isSignificantCode(change.code)
    );
  } catch (error) {
    console.error("Error parsing diff:", error);
    return [];
  }
}

/**
 * Checks if a file is likely to contain code based on extension
 */
function isCodeFile(filename) {
  const codeExtensions = [
    '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.c', '.cpp', '.cs', 
    '.go', '.rb', '.php', '.html', '.css', '.scss', '.vue', '.svelte'
  ];
  return codeExtensions.some(ext => filename.endsWith(ext)) && 
         !filename.endsWith('package-lock.json') && 
         !filename.endsWith('package.json');
}

/**
 * Checks if a change is trivial (like a single bracket, whitespace, etc.)
 */
function isTrivialChange(code) {
  const trivialPatterns = [
    /^[\s{}();,]*$/, // Just brackets, semicolons, etc.
    /^"[^"]{0,3}",$/, // Short strings with comma
    /^'[^']{0,3}',$/, // Short strings with comma
    /^[0-9.]+,$/, // Just numbers
    /^\s*import\s+[^;]+;$/, // Simple imports
    /^\s*export\s+/, // Simple exports
    /^\s*\/\/.*/, // Comments
    /^\s*\/\*.*\*\/\s*$/ // Single-line block comments
  ];
  
  return trivialPatterns.some(pattern => pattern.test(code.trim()));
}

/**
 * Checks if code is significant enough to generate questions about
 */
function isSignificantCode(code) {
  return code.includes('function') || 
         code.includes('class') || 
         code.includes('if') || 
         code.includes('for') || 
         code.includes('return') ||
         code.includes('useState') ||
         code.includes('useEffect') ||
         code.includes('<Route') ||
         code.includes('import ') ||
         code.includes('export ') ||
         code.includes('async ') ||
         (code.includes('{') && code.includes('}') && code.includes(':')); // CSS rule
}

/**
 * Consolidates related changes that are likely part of the same code block
 */
function consolidateChanges(changes) {
  const consolidated = [];
  let current = null;
  
  for (const change of changes) {
    if (!current || current.type !== change.type || current.file !== change.file) {
      if (current) {
        consolidated.push(current);
      }
      current = { ...change };
    } else {
      current.code += '\n' + change.code;
    }
  }
  
  if (current) {
    consolidated.push(current);
  }
  
  return consolidated;
}

module.exports = { parseCodeDiff };
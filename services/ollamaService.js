const axios = require('axios');

const languageMap = {
  'js': 'JavaScript', 'jsx': 'JavaScript/React', 'ts': 'TypeScript', 'tsx': 'TypeScript/React',
  'py': 'Python', 'java': 'Java', 'rb': 'Ruby', 'php': 'PHP', 'go': 'Go',
  'cs': 'C#', 'cpp': 'C++', 'c': 'C', 'swift': 'Swift', 'kt': 'Kotlin',
  'rs': 'Rust', 'scala': 'Scala', 'html': 'HTML', 'css': 'CSS', 'sql': 'SQL'
};

// Add this function to create a much simpler prompt
function createSimplePrompt(codeChanges, commitMessage, questionCount) {
  // Extract just a small sample of code to reduce complexity
  let codeSample = "";
  if (Array.isArray(codeChanges) && codeChanges.length > 0 && codeChanges[0].code) {
    // Take just the first 200 characters of the first code change
    codeSample = codeChanges[0].code.substring(0, 200) + "...";
  }
  
  // Create an extremely simple prompt
  return `Create ${questionCount} multiple choice questions about this code:
  
${codeSample}

Commit message: "${commitMessage}"

Format as JSON array with question, options (A,B,C,D), correctAnswer, and explanation fields.`;
}

// Add this function to handle streaming responses
async function streamingOllamaRequest(modelToUse, prompt, controller) {
  console.log(`Using streaming mode with ${modelToUse} to avoid timeouts`);
  
  try {
    const response = await axios.post('http://localhost:11434/api/generate', {
      model: modelToUse,
      prompt: prompt,
      stream: true,
      options: {
        temperature: 0.5,
        top_p: 0.95,
        top_k: 50,
        num_predict: 1024
      }
    }, {
      signal: controller.signal,
      timeout: 300000, // 5 minute timeout
      responseType: 'stream'
    });
    
    return new Promise((resolve, reject) => {
      let fullResponse = '';
      
      response.data.on('data', (chunk) => {
        try {
          const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
          for (const line of lines) {
            const data = JSON.parse(line);
            if (data.response) {
              fullResponse += data.response;
              // Log progress periodically
              if (fullResponse.length % 100 === 0) {
                console.log(`Received ${fullResponse.length} characters so far...`);
              }
            }
          }
        } catch (e) {
          console.error('Error parsing streaming chunk:', e.message);
        }
      });
      
      response.data.on('end', () => {
        console.log('Stream ended, total response length:', fullResponse.length);
        resolve(fullResponse);
      });
      
      response.data.on('error', (err) => {
        console.error('Stream error:', err.message);
        reject(err);
      });
    });
  } catch (error) {
    console.error('Streaming request error:', error.message);
    throw error;
  }
}

async function generateQuestionsWithOllama(codeChanges, commitMessage, taskDetails, questionCount = 5) {
  try {
    console.log(`Starting question generation process for ${questionCount} code-focused questions...`);
    
    // Check for model preference in environment variables
    const envPreferredModel = process.env.OLLAMA_MODEL || 'tinyllama';
    console.log(`Model preference from .env: ${envPreferredModel}`);
    
    // Check if we should skip Ollama and use default questions directly
    const skipOllama = process.env.SKIP_OLLAMA === 'true';
    if (skipOllama) {
      console.log('SKIP_OLLAMA is true, using default questions immediately');
      return getCodeBasedDefaultQuestions(codeChanges, commitMessage, 'JavaScript/React', questionCount);
    }
    
    // Check if we're using a small model that struggles with JSON
    const isSmallModel = envPreferredModel.includes('tiny');
    if (isSmallModel && process.env.SKIP_SMALL_MODELS !== 'false') {
      console.log('Small model detected, using default questions for better performance');
      return getCodeBasedDefaultQuestions(codeChanges, commitMessage, 'JavaScript/React', questionCount);
    }
    
    // Check if Ollama is available and get available models
    let availableModels = [];
    try {
      const healthCheck = await axios.get('http://localhost:11434/api/tags', {
        timeout: 5000
      });
      console.log('Ollama is available:', healthCheck.status === 200);
      
      // Get list of available models
      if (healthCheck.data && healthCheck.data.models) {
        availableModels = healthCheck.data.models.map(model => model.name);
        console.log('Available Ollama models:', availableModels);
      }
    } catch (healthError) {
      console.error('Ollama health check failed:', healthError.message);
      console.log('Proceeding with default questions due to health check failure');
      return getCodeBasedDefaultQuestions(codeChanges, commitMessage, 'JavaScript/React', questionCount);
    }
    
    // Look for a better model than TinyLlama if available
    let modelToUse = null;
    const preferredModels = ['codellama', 'llama3', 'llama2', 'mistral'];
    
    // First try to find a better model
    for (const model of preferredModels) {
      if (availableModels.includes(model)) {
        modelToUse = model;
        console.log(`Using better model: ${modelToUse}`);
        break;
      }
      
      // Try with :latest tag
      const modelWithTag = `${model}:latest`;
      if (availableModels.includes(modelWithTag)) {
        modelToUse = modelWithTag;
        console.log(`Using better model: ${modelToUse}`);
        break;
      }
    }
    
    // If no better model found, use the one from .env
    if (!modelToUse) {
      // Check if the exact model name from .env is available
      if (availableModels.includes(envPreferredModel)) {
        modelToUse = envPreferredModel;
        console.log(`Using model from .env: ${modelToUse}`);
      } 
      // Check if model with :latest tag is available
      else if (availableModels.includes(`${envPreferredModel}:latest`)) {
        modelToUse = `${envPreferredModel}:latest`;
        console.log(`Using model from .env with :latest tag: ${modelToUse}`);
      }
    }
    
    // If still no model found or we're using TinyLlama, use default questions
    if (!modelToUse || modelToUse.includes('tiny')) {
      console.log('No suitable model found, using default questions');
      return getCodeBasedDefaultQuestions(codeChanges, commitMessage, 'JavaScript/React', questionCount);
    }
    
    // Create prompt for larger models
    const prompt = `You are a programming instructor creating a quiz about code changes in a GitHub commit. 
Generate exactly ${questionCount} multiple-choice questions based on the code changes.

Commit message: "${commitMessage}"

Format as JSON array:
[
  {
    "question": "What does this code do?",
    "options": ["A: Option 1", "B: Option 2", "C: Option 3", "D: Option 4"],
    "correctAnswer": "A: Option 1",
    "explanation": "Explanation referencing the code"
  }
]`;
    
    console.log('Sending prompt to Ollama...');
    console.log('Prompt length:', prompt.length);
    
    // Single attempt with a good model
    try {
      console.log(`Attempting request with model: ${modelToUse}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log(`Request timeout after 60 seconds, aborting...`);
        controller.abort();
      }, 60000); // 1 minute timeout for better models
      
      const response = await axios.post('http://localhost:11434/api/generate', {
        model: modelToUse,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          top_k: 40,
          num_predict: 2048
        }
      }, {
        signal: controller.signal,
        timeout: 60000
      });
      
      clearTimeout(timeoutId);
      console.log(`Received response from Ollama (${modelToUse})`);
      
      // Try to parse JSON from the response
      const responseText = response.data.response;
      console.log('Response length:', responseText.length);
      
      const jsonMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonMatch) {
        try {
          const questions = JSON.parse(jsonMatch[0]);
          console.log(`Successfully parsed ${questions.length} questions from Ollama (${modelToUse})`);
          
          // Validate questions and return
          const validatedQuestions = questions
            .map(q => validateQuestion(q))
            .filter(q => q !== null);
          
          if (validatedQuestions.length < questionCount) {
            console.log(`Ollama provided ${validatedQuestions.length} valid questions, supplementing with defaults`);
            const defaultQuestions = getCodeBasedDefaultQuestions(codeChanges, commitMessage, 'JavaScript/React');
            validatedQuestions.push(...defaultQuestions.slice(0, questionCount - validatedQuestions.length));
          }
          
          return validatedQuestions.slice(0, questionCount);
        } catch (parseError) {
          console.error('Error parsing JSON from Ollama response:', parseError.message);
        }
      } else {
        console.log('No valid JSON found in response');
      }
      
      // If we get here, something went wrong with parsing
      console.log('Falling back to default questions');
      return getCodeBasedDefaultQuestions(codeChanges, commitMessage, 'JavaScript/React', questionCount);
      
    } catch (requestError) {
      console.error(`Ollama (${modelToUse}) request failed:`, requestError.message);
      console.log('Using default questions due to request failure');
      return getCodeBasedDefaultQuestions(codeChanges, commitMessage, 'JavaScript/React', questionCount);
    }
  } catch (error) {
    console.error('Error in Ollama service:', error.message);
    return getCodeBasedDefaultQuestions(codeChanges, commitMessage, 'JavaScript/React', questionCount);
  }
}

function getCodeBasedDefaultQuestions(codeChanges, commitMessage, language = 'JavaScript/React', count = 5) {
  console.log(`Generating ${count} code-based default questions for ${language}`);
  
  const defaultQuestions = [];
  const seenFiles = new Set();
  const seenQuestions = new Set();

  // Add a question about the commit purpose
  const commitQuestion = {
    question: `What is the purpose of the commit "${commitMessage.substring(0, 30)}${commitMessage.length > 30 ? '...' : ''}"?`,
    options: [
      "A: Adding new features",
      "B: Fixing bugs",
      "C: Refactoring code",
      "D: Updating documentation"
    ],
    correctAnswer: commitMessage.toLowerCase().includes('fix') ? 
                  "B: Fixing bugs" : 
                  "A: Adding new features",
    explanation: `Based on the commit message "${commitMessage}", this appears to be ${
      commitMessage.toLowerCase().includes('fix') ? 'fixing a bug' : 'adding new functionality'
    }.`
  };
  defaultQuestions.push(commitQuestion);
  seenQuestions.add(`${commitQuestion.question}|commit`);

  // Select significant changes from different files
  const significantChanges = codeChanges
    .filter(change => 
      change.code && 
      change.code.trim().length > 20 && 
      change.file && 
      !change.file.endsWith('package-lock.json') && 
      !change.file.endsWith('package.json') &&
      !seenFiles.has(change.file)
    )
    .sort((a, b) => b.code.length - a.code.length)
    .slice(0, 4)
    .map(change => {
      seenFiles.add(change.file);
      return change;
    });

  for (const change of significantChanges) {
    const fileExt = change.file.split('.').pop().toLowerCase();
    const codeSnippet = change.code.trim();
    const codeType = analyzeCodeType(codeSnippet, fileExt);
    
    let question;
    if (fileExt === 'css') {
      question = {
        question: `What is the effect of the CSS change in ${change.file}?`,
        options: [
          "A: Adjusts layout alignment",
          "B: Changes font styling",
          "C: Adds animations",
          "D: Modifies colors"
        ],
        correctAnswer: "A: Adjusts layout alignment",
        explanation: `The CSS change in ${change.file} modifies layout properties, aligning with the commit "${commitMessage}". Sample: ${codeSnippet.substring(0, 50)}...`
      };
    } else if (codeType === 'React Route') {
      question = {
        question: `What does the routing change in ${change.file} accomplish?`,
        options: [
          "A: Adds a new navigation path",
          "B: Removes an existing route",
          "C: Modifies route parameters",
          "D: Changes route rendering logic"
        ],
        correctAnswer: "A: Adds a new navigation path",
        explanation: `The routing change in ${change.file} adds a new path, as shown: ${codeSnippet.substring(0, 50)}...`
      };
    } else if (codeType === 'Component Import') {
      question = {
        question: `What is the purpose of the import statement in ${change.file}?`,
        options: [
          "A: Imports a new component for rendering",
          "B: Imports a utility function",
          "C: Imports a styling module",
          "D: Imports a configuration file"
        ],
        correctAnswer: "A: Imports a new component for rendering",
        explanation: `The import in ${change.file} brings in a component, as shown: ${codeSnippet.substring(0, 50)}...`
      };
    } else if (codeType === 'React Component') {
      question = {
        question: `What does the React component in ${change.file} do?`,
        options: [
          "A: Renders dynamic UI elements",
          "B: Manages application routing",
          "C: Handles form submissions",
          "D: Performs data validation"
        ],
        correctAnswer: "A: Renders dynamic UI elements",
        explanation: `The React component in ${change.file} renders UI elements, as shown: ${codeSnippet.substring(0, 50)}...`
      };
    } else if (codeType === 'Function/Method Definition') {
      question = {
        question: `What does the function in ${change.file} do?`,
        options: [
          "A: Processes data and returns a result",
          "B: Modifies external state or resources",
          "C: Handles errors or exceptions",
          "D: Validates input parameters"
        ],
        correctAnswer: "A: Processes data and returns a result",
        explanation: `The function in ${change.file} processes data, as shown: ${codeSnippet.substring(0, 50)}...`
      };
    } else if (codeType === 'AI/ML Code') {
      question = {
        question: `What AI/ML functionality is implemented in ${change.file}?`,
        options: [
          "A: Data preprocessing for model input",
          "B: Model inference or prediction",
          "C: Training pipeline configuration",
          "D: Result evaluation or metrics calculation"
        ],
        correctAnswer: "B: Model inference or prediction",
        explanation: `The AI code in ${change.file} appears to handle model inference, as shown: ${codeSnippet.substring(0, 50)}...`
      };
    } else if (codeType === 'API Integration') {
      question = {
        question: `What is the purpose of the API integration in ${change.file}?`,
        options: [
          "A: Fetching external data",
          "B: Sending data to external services",
          "C: Authentication with third-party services",
          "D: Webhook handling"
        ],
        correctAnswer: "A: Fetching external data",
        explanation: `The API integration in ${change.file} appears to fetch data, as shown: ${codeSnippet.substring(0, 50)}...`
      };
    } else {
      question = {
        question: `What does the code change in ${change.file} accomplish?`,
        options: [
          "A: Implements a new feature",
          "B: Fixes a bug or issue",
          "C: Improves code readability",
          "D: Optimizes performance"
        ],
        correctAnswer: commitMessage.toLowerCase().includes('fix') ? 
                      "B: Fixes a bug or issue" : 
                      "A: Implements a new feature",
        explanation: `The code change in ${change.file} aligns with the commit "${commitMessage}". Sample: ${codeSnippet.substring(0, 50)}...`
      };
    }

    const questionKey = `${question.question}|${change.file}`;
    if (!seenQuestions.has(questionKey)) {
      defaultQuestions.push(question);
      seenQuestions.add(questionKey);
    }
  }
  
  // Add AI-specific questions if needed
  const aiQuestions = [
    {
      question: "What is a key consideration when implementing AI features in a web application?",
      options: [
        "A: Using the largest model available regardless of response time",
        "B: Balancing model complexity with performance requirements",
        "C: Always processing data on the client side",
        "D: Avoiding fallback mechanisms"
      ],
      correctAnswer: "B: Balancing model complexity with performance requirements",
      explanation: "AI implementations must balance accuracy with performance constraints like response time and resource usage."
    },
    {
      question: "What is the purpose of model quantization in AI deployment?",
      options: [
        "A: To increase model size for better accuracy",
        "B: To reduce model size and improve inference speed",
        "C: To convert models between different frameworks",
        "D: To enable training on mobile devices"
      ],
      correctAnswer: "B: To reduce model size and improve inference speed",
      explanation: "Quantization reduces model precision (e.g., from float32 to int8) to decrease size and improve inference speed."
    },
    {
      question: "What is a benefit of using local AI models like Ollama instead of cloud APIs?",
      options: [
        "A: They always provide better accuracy",
        "B: They require less computational resources",
        "C: They provide data privacy and work without internet connection",
        "D: They are always faster than cloud alternatives"
      ],
      correctAnswer: "C: They provide data privacy and work without internet connection",
      explanation: "Local models keep sensitive data on-premise and can function without internet connectivity."
    }
  ];
  
  // Add general code quality questions if needed
  const generalCodeQuestions = [
    {
      question: "What is a key principle of clean code?",
      options: [
        "A: Writing minimal comments",
        "B: Creating multi-purpose functions",
        "C: Using descriptive names for variables and functions",
        "D: Maximizing function length"
      ],
      correctAnswer: "C: Using descriptive names for variables and functions",
      explanation: "Descriptive names make code self-documenting and easier to understand."
    },
    {
      question: "What is the purpose of code refactoring?",
      options: [
        "A: Adding new features",
        "B: Improving code structure without changing behavior",
        "C: Fixing bugs",
        "D: Rewriting the entire application"
      ],
      correctAnswer: "B: Improving code structure without changing behavior",
      explanation: "Refactoring improves code maintainability."
    }
  ];
  
  // Prioritize AI questions if we need more questions
  while (defaultQuestions.length < count) {
    // First try to add AI questions
    if (aiQuestions.length > 0) {
      const question = aiQuestions.shift();
      const questionKey = `${question.question}|ai`;
      if (!seenQuestions.has(questionKey)) {
        defaultQuestions.push(question);
        seenQuestions.add(questionKey);
        continue;
      }
    }
    
    // Fall back to general questions if needed
    if (generalCodeQuestions.length > 0) {
      const question = generalCodeQuestions.shift();
      const questionKey = `${question.question}|general`;
      if (!seenQuestions.has(questionKey)) {
        defaultQuestions.push(question);
        seenQuestions.add(questionKey);
      }
    } else {
      break; // No more questions to add
    }
  }
  
  return defaultQuestions.slice(0, count);
}

function analyzeCodeType(code, fileExt) {
  if (!code) return null;
  
  if (fileExt === 'css' && (code.includes('{') || code.includes('}') || code.includes(':'))) {
    return 'CSS Rule';
  }
  
  if ((fileExt === 'js' || fileExt === 'jsx') && (code.includes('<Route') || code.includes('react-router-dom'))) {
    return 'React Route';
  }
  
  if ((fileExt === 'js' || fileExt === 'jsx') && code.includes('import ') && code.includes('from "./pages/')) {
    return 'Component Import';
  }
  
  if ((fileExt === 'js' || fileExt === 'jsx') && 
      (code.includes('useState') || code.includes('useEffect') || code.includes('return (') || code.includes('React.Component'))) {
    return 'React Component';
  }
  
  if ((fileExt === 'js' || fileExt === 'jsx' || fileExt === 'py') && 
      (code.includes('function ') || code.includes('def ') || code.includes('=>') || code.includes('class '))) {
    return 'Function/Method Definition';
  }
  
  // Detect AI/ML code
  if (code.includes('model') && 
      (code.includes('predict') || code.includes('inference') || code.includes('train') || 
       code.includes('pipeline') || code.includes('transformer') || code.includes('ollama'))) {
    return 'AI/ML Code';
  }
  
  // Detect API integration
  if (code.includes('axios') || code.includes('fetch(') || code.includes('request(') || 
      code.includes('api') || code.includes('http') || code.includes('endpoint')) {
    return 'API Integration';
  }
  
  return 'General Code';
}

function validateQuestion(question) {
  if (!question || typeof question !== 'object') {
    return null;
  }

  const { question: q, options, correctAnswer, explanation } = question;

  if (typeof q !== 'string' || q.trim() === '') {
    console.log('Invalid question:', q);
    return null;
  }

  if (!Array.isArray(options) || options.length !== 4) {
    console.log('Invalid options:', options);
    return null;
  }

  if (typeof correctAnswer !== 'string' || !options.includes(correctAnswer)) {
    console.log('Invalid correct answer:', correctAnswer);
    return null;
  }

  if (typeof explanation !== 'string' || explanation.trim() === '') {
    console.log('Invalid explanation:', explanation);
    return null;
  }

  const fixedQuestion = {
    question: q.trim(),
    options: options.map(opt => opt.trim()),
    correctAnswer: correctAnswer.trim(),
    explanation: explanation.trim()
  };

  const uniqueOptions = [...new Set(fixedQuestion.options)];
  if (uniqueOptions.length !== 4) {
    console.log('Duplicate options found:', fixedQuestion.options);
    return null;
  }

  return fixedQuestion;
}

module.exports = {
  generateQuestionsWithOllama
};






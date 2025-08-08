import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const groqApiKey = process.env.PYTHON_CODE_GROQ_API_KEY!;

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Interface for the coding question
interface CodingQuestion {
  sr_no: number;
  question: string;
  approach: string;
}

// Interface for Groq response structure
interface GroqCodeResponse {
  class_name: string;
  function_name: string;
  complete_code: string;
  test_cases: {
    input: string;
    expected_output: string;
    description: string;
  }[];
  explanation: string;
  time_complexity: string;
  space_complexity: string;
  input_format: string;
  output_format: string;
}

// Interface for the final stored code
interface PythonCodeRecord {
  sr_no: number;
  question: string;
  approach: string;
  class_name: string;
  function_name: string;
  complete_code: string;
  test_cases: string; // JSON string of test cases array
  explanation: string;
  time_complexity: string;
  space_complexity: string;
  input_format: string;
  output_format: string;
  created_at: string;
}

// Interface for questions_done table structure
interface QuestionsDoneRecord {
  date: string;
  coding_theory_java: number | null;
  coding_java: number | null;
  coding_theory_python: number | null;
  coding_python: number | null;
}

// Generate default test cases based on question content
function generateDefaultTestCases(question: string, approach: string): any[] {
  return [
    {
      input: "1",
      expected_output: "1",
      description: "Basic test case - minimal input"
    },
    {
      input: "5",
      expected_output: "Expected output for input 5",
      description: "Standard test case"
    },
    {
      input: "10",
      expected_output: "Expected output for input 10", 
      description: "Edge case - larger input"
    }
  ];
}

// Robust JSON cleaning and parsing function
function cleanAndParseJSON(jsonString: string): any {
  console.log('Attempting to parse JSON string of length:', jsonString.length);
  
  try {
    // First attempt: parse as-is
    const parsed = JSON.parse(jsonString);
    console.log('Initial JSON parse successful');
    return parsed;
  } catch (error) {
    console.log('Initial JSON parse failed, attempting comprehensive cleaning...');
    
    let cleaned = jsonString.trim();
    
    // Step 1: Remove any leading/trailing non-JSON content
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    
    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
      throw new Error('No valid JSON object boundaries found');
    }
    
    cleaned = cleaned.substring(jsonStart, jsonEnd + 1);
    
    // Step 2: Basic cleaning
    // Remove comments and fix common issues
    cleaned = cleaned.replace(/\/\/.*$/gm, '');
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
    
    // Step 3: Try parsing the cleaned version
    try {
      const parsed = JSON.parse(cleaned);
      console.log('Cleaned JSON parse successful');
      return parsed;
    } catch (secondError) {
      console.log('Cleaned JSON parse failed, trying fallback approach...');
      
      // Step 4: Fallback parsing using regex extraction
      try {
        const fallbackResult = fallbackJSONParse(cleaned);
        console.log('Fallback JSON parse successful');
        return fallbackResult;
      } catch (fallbackError) {
        console.error('All JSON parsing attempts failed');
        console.error('Original error:', error);
        console.error('Second error:', secondError);
        console.error('Fallback error:', fallbackError);
        
        throw new Error(`Failed to parse JSON after all attempts. Content preview: ${cleaned.substring(0, 200)}...`);
      }
    }
  }
}

// Fallback JSON parsing using regex and manual reconstruction
function fallbackJSONParse(jsonString: string): any {
  console.log('Using fallback JSON parsing approach...');
  
  const result: any = {};
  
  // Extract string fields using more flexible regex
  const stringFields = [
    'class_name', 'function_name', 'complete_code', 'explanation', 
    'time_complexity', 'space_complexity', 'input_format', 'output_format'
  ];
  
  for (const field of stringFields) {
    // More flexible regex that handles multiline and escaped content
    const patterns = [
      new RegExp(`"${field}"\\s*:\\s*"([^"]*(?:\\\\.[^"]*)*)"`, 's'),
      new RegExp(`'${field}'\\s*:\\s*'([^']*(?:\\\\.[^']*)*)'`, 's'),
      new RegExp(`"${field}"\\s*:\\s*\`([^\`]*)\``, 's')
    ];
    
    for (const pattern of patterns) {
      const match = jsonString.match(pattern);
      if (match) {
        result[field] = match[1]
          .replace(/\\"/g, '"')
          .replace(/\\'/g, "'")
          .replace(/\\n/g, '\n')
          .replace(/\\t/g, '\t')
          .replace(/\\\\/g, '\\');
        break;
      }
    }
  }
  
  // Extract test_cases array with more robust approach
  result.test_cases = extractTestCases(jsonString);
  
  // Set defaults for missing fields
  if (!result.class_name) result.class_name = 'Solution';
  if (!result.function_name) result.function_name = 'solve';
  if (!result.time_complexity) result.time_complexity = 'O(n) - needs analysis';
  if (!result.space_complexity) result.space_complexity = 'O(1) - needs analysis';
  if (!result.input_format) result.input_format = 'Standard input format';
  if (!result.output_format) result.output_format = 'Standard output format';
  if (!result.explanation) result.explanation = 'Solution explanation needed';
  
  return result;
}

// Extract test cases from JSON string with multiple fallback strategies
function extractTestCases(jsonString: string): any[] {
  try {
    // Strategy 1: Find the test_cases array block
    const testCasesMatch = jsonString.match(/"test_cases"\s*:\s*\[([\s\S]*?)\]/);
    
    if (testCasesMatch) {
      const testCasesContent = testCasesMatch[1];
      const testCases: any[] = [];
      
      // Find individual test case objects
      const testCasePattern = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
      let match;
      
      while ((match = testCasePattern.exec(testCasesContent)) !== null) {
        try {
          const testCaseStr = match[0];
          const testCase = extractTestCaseFields(testCaseStr);
          if (testCase.input && testCase.expected_output && testCase.description) {
            testCases.push(testCase);
          }
        } catch (e) {
          console.log('Failed to parse individual test case:', e);
        }
      }
      
      if (testCases.length > 0) {
        return testCases;
      }
    }
    
    // Strategy 2: Look for individual test case patterns scattered in the text
    const scatteredTestCases = extractScatteredTestCases(jsonString);
    if (scatteredTestCases.length > 0) {
      return scatteredTestCases;
    }
    
    // Strategy 3: Generate default test cases
    console.log('No valid test cases found, generating defaults');
    return generateDefaultTestCases('', '');
    
  } catch (error) {
    console.log('Test case extraction failed, using defaults:', error);
    return generateDefaultTestCases('', '');
  }
}

// Extract test case fields from a test case object string
function extractTestCaseFields(testCaseStr: string): any {
  const testCase: any = {};
  
  const fields = ['input', 'expected_output', 'description'];
  
  for (const field of fields) {
    const patterns = [
      new RegExp(`"${field}"\\s*:\\s*"([^"]*(?:\\\\.[^"]*)*)"`, 's'),
      new RegExp(`'${field}'\\s*:\\s*'([^']*(?:\\\\.[^']*)*)'`, 's')
    ];
    
    for (const pattern of patterns) {
      const match = testCaseStr.match(pattern);
      if (match) {
        testCase[field] = match[1]
          .replace(/\\"/g, '"')
          .replace(/\\'/g, "'")
          .replace(/\\n/g, '\n')
          .replace(/\\t/g, '\t')
          .replace(/\\\\/g, '\\');
        break;
      }
    }
  }
  
  return testCase;
}

// Extract scattered test cases from the entire JSON string
function extractScatteredTestCases(jsonString: string): any[] {
  const testCases: any[] = [];
  
  // Look for patterns like "input": "...", "expected_output": "...", "description": "..."
  const inputMatches = jsonString.match(/"input"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/g);
  const outputMatches = jsonString.match(/"expected_output"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/g);
  const descMatches = jsonString.match(/"description"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/g);
  
  if (inputMatches && outputMatches && descMatches) {
    const minLength = Math.min(inputMatches.length, outputMatches.length, descMatches.length);
    
    for (let i = 0; i < minLength; i++) {
      const input = inputMatches[i].match(/"input"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/)?.[1] || '';
      const output = outputMatches[i].match(/"expected_output"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/)?.[1] || '';
      const desc = descMatches[i].match(/"description"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/)?.[1] || '';
      
      if (input && output && desc) {
        testCases.push({
          input: input.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\'),
          expected_output: output.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\'),
          description: desc.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\')
        });
      }
    }
  }
  
  return testCases;
}

// Function to extract JSON from response content
function extractJSON(content: string): string {
  // Remove markdown code blocks
  if (content.includes('```json')) {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      return jsonMatch[1].trim();
    }
  } else if (content.includes('```')) {
    const codeMatch = content.match(/```\s*([\s\S]*?)\s*```/);
    if (codeMatch) {
      return codeMatch[1].trim();
    }
  }

  // Find JSON boundaries
  const jsonStart = content.indexOf('{');
  const jsonEnd = content.lastIndexOf('}');
  
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    return content.substring(jsonStart, jsonEnd + 1);
  }

  return content.trim();
}

// Function to get the next question number from questions_done table
async function getNextQuestionNumber(): Promise<number> {
  try {
    // Get the record from questions_done table where id = 1
    const { data: existingRecord, error: fetchError } = await supabase
      .from('questions_done')
      .select('*')
      .eq('id', 1)
      .single();

    if (fetchError) {
      console.error('Error fetching questions_done record:', fetchError);
      throw new Error('Failed to fetch questions_done record');
    }

    let nextQuestionNumber = 1; // Default to first question

    if (existingRecord && existingRecord.coding_python) {
      // If coding_python is a number, increment it by 1
      if (typeof existingRecord.coding_python === 'number') {
        nextQuestionNumber = existingRecord.coding_python + 1;
      } 
      // If it's an array (legacy), get the max and increment
      else if (Array.isArray(existingRecord.coding_python) && existingRecord.coding_python.length > 0) {
        const maxQuestionNumber = Math.max(...existingRecord.coding_python);
        nextQuestionNumber = maxQuestionNumber + 1;
      }
    }

    return nextQuestionNumber;
  } catch (error) {
    console.error('Error in getNextQuestionNumber:', error);
    throw error;
  }
}

// Enhanced Groq API prompt template with clearer instructions
const createGroqPrompt = (question: string, approach: string): string => {
  return `You are a Python coding expert. Generate a complete solution for this coding question and return ONLY a valid JSON object.

**Question:** ${question}
**Approach:** ${approach}

**CRITICAL REQUIREMENTS:**
1. Return ONLY the JSON object - no text before or after
2. Use proper JSON syntax with double quotes
3. Ensure test_cases is an array with at least 2 test cases
4. Escape special characters: \\n for newlines, \\t for tabs, \\" for quotes, \\\\ for backslashes

**Required JSON Format:**
{
  "class_name": "Solution",
  "function_name": "solve", 
  "complete_code": "import sys\\nfrom typing import List\\n\\nclass Solution:\\n    def solve(self):\\n        # Your implementation here\\n        pass\\n\\ndef main():\\n    solution = Solution()\\n    # Read input and call solve\\n    pass\\n\\nif __name__ == '__main__':\\n    main()",
  "test_cases": [
    {
      "input": "sample input",
      "expected_output": "expected result", 
      "description": "Test case description"
    },
    {
      "input": "another input",
      "expected_output": "another result",
      "description": "Another test case"
    }
  ],
  "explanation": "Brief explanation of the solution approach",
  "time_complexity": "O(n) with explanation",
  "space_complexity": "O(1) with explanation",
  "input_format": "Description of input format",
  "output_format": "Description of output format"
}

**Code Requirements:**
- Use input() for reading from stdin
- Use print() for output
- Handle dynamic input (no hardcoded values)
- Include error handling
- Follow Python 3 syntax
- Provide at least 2 diverse test cases

RESPOND WITH ONLY THE JSON OBJECT:`;
};

// Function to update questions_done table
async function updateQuestionsDoneTable(questionNumber: number, category: 'coding_theory_java' | 'coding_java' | 'coding_theory_python' | 'coding_python') {
  try {
    console.log(`Starting updateQuestionsDoneTable - Question: ${questionNumber}, Category: ${category}`);

    // Simply set the current question number as the value
    const updatedRecord = {
      [category]: questionNumber
    };

    console.log('Update payload:', updatedRecord);

    // Update the record where id = 1
    const { error: updateError } = await supabase
      .from('questions_done')
      .update(updatedRecord)
      .eq('id', 1);

    if (updateError) {
      console.error('Error updating questions_done record:', updateError);
      throw new Error(`Failed to update record: ${updateError.message}`);
    } else {
      console.log(`Successfully updated questions_done record - set ${category} to ${questionNumber}`);
    }
  } catch (error) {
    console.error('Error in updateQuestionsDoneTable:', error);
    throw error;
  }
}

// Function to call Groq API with improved error handling
async function callGroqAPI(prompt: string): Promise<GroqCodeResponse> {
  console.log('Calling Groq API...');
  
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${groqApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a Python programming expert. Always return ONLY valid JSON objects with properly escaped strings. Never include markdown formatting, explanatory text, or comments outside the JSON. The test_cases field must be a non-empty array with at least 2 test cases.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 6000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Groq API error response:', errorText);
    throw new Error(`Groq API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    console.error('Invalid Groq API response structure:', JSON.stringify(data, null, 2));
    throw new Error('Invalid Groq API response structure');
  }

  let content = data.choices[0].message.content.trim();
  console.log('Raw Groq response received, length:', content.length);
  
  // Extract JSON from the response
  content = extractJSON(content);
  console.log('Extracted JSON length:', content.length);
  
  try {
    // Use the improved JSON parsing function
    const parsed = cleanAndParseJSON(content);
    console.log('Successfully parsed Groq JSON response');
    
    // Validate and ensure all required fields are present
    const validated = validateAndFixGroqResponse(parsed);
    
    console.log('Groq response validation and fixing successful');
    return validated as GroqCodeResponse;
    
  } catch (parseError) {
    console.error('JSON parsing failed:', parseError);
    console.error('Content that failed to parse (preview):', content.substring(0, 500));
    
    // Create a fallback response with default values
    console.log('Creating fallback response due to parsing failure');
    return createFallbackResponse();
  }
}

// Validate and fix Groq response
function validateAndFixGroqResponse(parsed: any): GroqCodeResponse {
  const response: any = { ...parsed };
  
  // Ensure required string fields exist
  if (!response.class_name || typeof response.class_name !== 'string') {
    response.class_name = 'Solution';
  }
  
  if (!response.function_name || typeof response.function_name !== 'string') {
    response.function_name = 'solve';
  }
  
  if (!response.complete_code || typeof response.complete_code !== 'string') {
    response.complete_code = `import sys\nfrom typing import List\n\nclass Solution:\n    def solve(self):\n        # Implementation needed\n        pass\n\ndef main():\n    solution = Solution()\n    # Read input and call solve\n    pass\n\nif __name__ == '__main__':\n    main()`;
  }
  
  if (!response.explanation || typeof response.explanation !== 'string') {
    response.explanation = 'Solution explanation needed';
  }
  
  if (!response.time_complexity || typeof response.time_complexity !== 'string') {
    response.time_complexity = 'O(n) - needs analysis';
  }
  
  if (!response.space_complexity || typeof response.space_complexity !== 'string') {
    response.space_complexity = 'O(1) - needs analysis';
  }
  
  if (!response.input_format || typeof response.input_format !== 'string') {
    response.input_format = 'Standard input format';
  }
  
  if (!response.output_format || typeof response.output_format !== 'string') {
    response.output_format = 'Standard output format';
  }
  
  // Validate and fix test_cases array
  if (!Array.isArray(response.test_cases) || response.test_cases.length === 0) {
    console.log('Invalid or missing test_cases, generating defaults');
    response.test_cases = generateDefaultTestCases('', '');
  } else {
    // Validate each test case
    response.test_cases = response.test_cases.map((testCase: any, index: number) => {
      if (!testCase || typeof testCase !== 'object') {
        console.log(`Invalid test case at index ${index}, generating default`);
        return {
          input: `test_input_${index + 1}`,
          expected_output: `expected_output_${index + 1}`,
          description: `Test case ${index + 1}`
        };
      }
      
      return {
        input: testCase.input || `test_input_${index + 1}`,
        expected_output: testCase.expected_output || `expected_output_${index + 1}`,
        description: testCase.description || `Test case ${index + 1}`
      };
    });
  }
  
  // Ensure at least 2 test cases
  if (response.test_cases.length < 2) {
    const additionalCases = generateDefaultTestCases('', '');
    response.test_cases = [...response.test_cases, ...additionalCases].slice(0, 3);
  }
  
  return response as GroqCodeResponse;
}

// Create fallback response when parsing completely fails
function createFallbackResponse(): GroqCodeResponse {
  return {
    class_name: 'Solution',
    function_name: 'solve',
    complete_code: `import sys\nfrom typing import List\n\nclass Solution:\n    def solve(self):\n        # Implementation needed - Groq parsing failed\n        print("Solution implementation needed")\n        return "result"\n\ndef main():\n    solution = Solution()\n    result = solution.solve()\n    print(result)\n\nif __name__ == '__main__':\n    main()`,
    test_cases: generateDefaultTestCases('', ''),
    explanation: 'Fallback solution created due to response parsing failure. Manual implementation needed.',
    time_complexity: 'O(n) - needs analysis',
    space_complexity: 'O(1) - needs analysis',
    input_format: 'Standard input format - needs specification',
    output_format: 'Standard output format - needs specification'
  };
}

// GET handler for App Router
export async function GET(request: NextRequest) {
  try {
    console.log('API endpoint called');
    
    // Extract api_key from URL search params
    const { searchParams } = new URL(request.url);
    const api_key = searchParams.get('api_key');

    // Validate API key
    if (!api_key || api_key !== process.env.API_KEY) {
      console.log('Invalid API key provided');
      return Response.json({ error: 'Invalid or missing API key' }, { status: 401 });
    }

    // Step 1: Get the next question number automatically
    console.log('Getting next question number...');
    const questionNumber = await getNextQuestionNumber();
    console.log('Next question number:', questionNumber);

    // Step 2: Fetch question from codingquestionrepo table
    console.log('Fetching question from database...');
    const { data: questionData, error: fetchError } = await supabase
      .from('codingquestionrepo')
      .select('sr_no, question, approach')
      .eq('sr_no', questionNumber)
      .single();

    if (fetchError || !questionData) {
      console.log('Question not found:', fetchError);
      return Response.json({ 
        error: 'Question not found', 
        details: `No question found with sr_no: ${questionNumber}`,
        next_question_number: questionNumber 
      }, { status: 404 });
    }

    console.log('Question found:', questionData.sr_no);

    // Step 3: Check if code already exists
    console.log('Checking for existing code...');
    const { data: existingCode } = await supabase
      .from('python_code')
      .select('*')
      .eq('sr_no', questionNumber)
      .single();

    let codeResult: PythonCodeRecord;

    if (existingCode) {
      console.log('Using existing code');
      // Return existing code and still update questions_done table
      codeResult = existingCode;
      
      // Update questions_done table for coding_python
      try {
        await updateQuestionsDoneTable(questionNumber, 'coding_python');
        console.log('Successfully updated questions_done table with existing code');
      } catch (updateError) {
        console.error('Failed to update questions_done table:', updateError);
        // Don't fail the entire request, just log the error
      }
    } else {
      console.log('Generating new code...');
      
      // Step 4: Generate Groq prompt and call API
      const prompt = createGroqPrompt(questionData.question, questionData.approach);
      
      let groqResponse: GroqCodeResponse;
      try {
        groqResponse = await callGroqAPI(prompt);
      } catch (groqError) {
        console.error('Groq API call failed:', groqError);
        // Use fallback response
        groqResponse = createFallbackResponse();
      }

      // Step 5: Prepare data for storage
      codeResult = {
        sr_no: questionData.sr_no,
        question: questionData.question,
        approach: questionData.approach,
        class_name: groqResponse.class_name,
        function_name: groqResponse.function_name,
        complete_code: groqResponse.complete_code,
        test_cases: JSON.stringify(groqResponse.test_cases), // Store as JSON string
        explanation: groqResponse.explanation,
        time_complexity: groqResponse.time_complexity,
        space_complexity: groqResponse.space_complexity,
        input_format: groqResponse.input_format,
        output_format: groqResponse.output_format,
        created_at: new Date().toISOString(),
      };

      console.log('Storing code in database...');
      // Step 6: Store code in python_code table
      const { error: insertError } = await supabase
        .from('python_code')
        .insert(codeResult);

      if (insertError) {
        console.error('Error storing code:', insertError);
        console.error('Data being inserted:', JSON.stringify(codeResult, null, 2));
        return Response.json({ 
          error: 'Failed to store code', 
          details: insertError.message,
          code: insertError.code,
          hint: insertError.hint
        }, { status: 500 });
      }

      // Step 7: Update questions_done table for coding_python
      try {
        await updateQuestionsDoneTable(questionNumber, 'coding_python');
        console.log('Successfully updated questions_done table with new code');
      } catch (updateError) {
        console.error('Failed to update questions_done table:', updateError);
        // Don't fail the entire request, just log the error
      }
    }

    // Step 8: Return the complete code data with parsed test cases for API response
    const responseData = {
      ...codeResult,
      test_cases: typeof codeResult.test_cases === 'string' 
        ? JSON.parse(codeResult.test_cases) 
        : codeResult.test_cases
    };

    console.log('API request completed successfully');
    return Response.json({
      success: true,
      data: responseData,
      question_number: questionNumber,
      message: existingCode ? 'Retrieved existing Python code and updated questions_done' : 'Generated new Python code and updated questions_done'
    }, { status: 200 });

  } catch (error) {
    console.error('API Error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack available');
    
    return Response.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
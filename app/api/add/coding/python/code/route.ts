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

// Enhanced JSON cleaning and parsing function
function cleanAndParseJSON(jsonString: string): any {
  console.log('Attempting to parse JSON string of length:', jsonString.length);
  console.log('First 200 characters:', jsonString.substring(0, 200));
  
  try {
    // First attempt: parse as-is
    return JSON.parse(jsonString);
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
    
    // Step 2: Fix common JSON issues systematically
    
    // Remove comments (single line and multi-line)
    cleaned = cleaned.replace(/\/\/.*$/gm, '');
    cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Fix trailing commas
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1');
    
    // Step 3: Handle string content more carefully
    // Split by quotes to handle string content separately
    const parts: string[] = [];
    let currentIndex = 0;
    let inString = false;
    let escapeNext = false;
    
    for (let i = 0; i < cleaned.length; i++) {
      const char = cleaned[i];
      
      if (!inString && char === '"') {
        // Starting a string
        parts.push(cleaned.substring(currentIndex, i));
        currentIndex = i;
        inString = true;
        escapeNext = false;
      } else if (inString && !escapeNext && char === '"') {
        // Ending a string
        const stringContent = cleaned.substring(currentIndex, i + 1);
        parts.push(cleanStringContent(stringContent));
        currentIndex = i + 1;
        inString = false;
        escapeNext = false;
      } else if (inString && char === '\\') {
        escapeNext = !escapeNext;
      } else {
        escapeNext = false;
      }
    }
    
    // Add remaining content
    if (currentIndex < cleaned.length) {
      parts.push(cleaned.substring(currentIndex));
    }
    
    cleaned = parts.join('');
    
    try {
      return JSON.parse(cleaned);
    } catch (secondError) {
      console.log('Advanced cleaning failed, trying fallback approach...');
      
      // Fallback: Try to reconstruct JSON more aggressively
      try {
        const fallbackResult = fallbackJSONParse(jsonString);
        return fallbackResult;
      } catch (fallbackError) {
        console.error('All JSON parsing attempts failed');
        console.error('Original error:', error);
        console.error('Second error:', secondError);
        console.error('Fallback error:', fallbackError);
        console.error('Final cleaned content:', cleaned.substring(0, 500));
        
        throw new Error(`Failed to parse JSON after all attempts. Last error: ${secondError instanceof Error ? secondError.message : 'Unknown'}`);
      }
    }
  }
}

// Helper function to clean string content
function cleanStringContent(str: string): string {
  // Don't modify the outer quotes, only clean the content inside
  if (str.length < 2 || !str.startsWith('"') || !str.endsWith('"')) {
    return str;
  }
  
  const innerContent = str.slice(1, -1);
  let cleaned = innerContent;
  
  // Fix common escape sequence issues
  cleaned = cleaned.replace(/\\\\/g, '\\'); // Fix double backslashes
  cleaned = cleaned.replace(/\\"/g, '"'); // Fix escaped quotes
  cleaned = cleaned.replace(/\\n/g, '\n'); // Fix newlines
  cleaned = cleaned.replace(/\\t/g, '\t'); // Fix tabs
  cleaned = cleaned.replace(/\\r/g, '\r'); // Fix carriage returns
  
  // Re-escape for JSON
  cleaned = cleaned.replace(/\\/g, '\\\\'); // Escape backslashes
  cleaned = cleaned.replace(/"/g, '\\"'); // Escape quotes
  cleaned = cleaned.replace(/\n/g, '\\n'); // Escape newlines
  cleaned = cleaned.replace(/\t/g, '\\t'); // Escape tabs
  cleaned = cleaned.replace(/\r/g, '\\r'); // Escape carriage returns
  cleaned = cleaned.replace(/\f/g, '\\f'); // Escape form feeds
  cleaned = cleaned.replace(/\b/g, '\\b'); // Escape backspaces
  
  return `"${cleaned}"`;
}

// Fallback JSON parsing using regex and manual reconstruction
function fallbackJSONParse(jsonString: string): any {
  console.log('Using fallback JSON parsing approach...');
  
  // Extract the main structure
  const jsonStart = jsonString.indexOf('{');
  const jsonEnd = jsonString.lastIndexOf('}');
  
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error('No JSON object boundaries found in fallback parse');
  }
  
  const content = jsonString.substring(jsonStart + 1, jsonEnd);
  
  // Simple field extraction using regex
  const result: any = {};
  
  // Extract string fields
  const stringFields = [
    'class_name', 'function_name', 'complete_code', 'explanation', 
    'time_complexity', 'space_complexity', 'input_format', 'output_format'
  ];
  
  for (const field of stringFields) {
    const regex = new RegExp(`"${field}"\\s*:\\s*"([^"]*(?:\\\\.[^"]*)*)"`, 's');
    const match = content.match(regex);
    if (match) {
      result[field] = match[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\\\/g, '\\');
    }
  }
  
  // Extract test_cases array
  const testCasesRegex = /"test_cases"\s*:\s*\[([\s\S]*?)\]/;
  const testCasesMatch = content.match(testCasesRegex);
  
  if (testCasesMatch) {
    const testCasesContent = testCasesMatch[1];
    const testCases: any[] = [];
    
    // Split test cases by object boundaries
    const testCaseRegex = /\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;
    let match;
    
    while ((match = testCaseRegex.exec(testCasesContent)) !== null) {
      const testCaseContent = match[1];
      const testCase: any = {};
      
      // Extract input, expected_output, description
      const inputMatch = testCaseContent.match(/"input"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
      const outputMatch = testCaseContent.match(/"expected_output"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
      const descMatch = testCaseContent.match(/"description"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
      
      if (inputMatch) testCase.input = inputMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
      if (outputMatch) testCase.expected_output = outputMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
      if (descMatch) testCase.description = descMatch[1].replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
      
      testCases.push(testCase);
    }
    
    result.test_cases = testCases;
  }
  
  // Validate required fields
  const requiredFields = [
    'class_name', 'function_name', 'complete_code', 'test_cases',
    'explanation', 'time_complexity', 'space_complexity', 'input_format', 'output_format'
  ];
  
  for (const field of requiredFields) {
    if (!(field in result)) {
      throw new Error(`Fallback parse: Missing required field: ${field}`);
    }
  }
  
  console.log('Fallback parsing successful');
  return result;
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

// Improved Groq API prompt template
const createGroqPrompt = (question: string, approach: string): string => {
  return `Generate a complete Python solution for this coding question. You must return ONLY a valid JSON object with no additional text, markdown, or formatting.

Question: ${question}
Approach: ${approach}

CRITICAL JSON FORMAT REQUIREMENTS:
1. Return ONLY the JSON object - no explanatory text before or after
2. Use double quotes for all string values
3. Properly escape all special characters in strings:
   - Newlines: \\n
   - Tabs: \\t
   - Backslashes: \\\\
   - Double quotes: \\"
4. No trailing commas
5. No comments in JSON

Required JSON structure:
{
  "class_name": "Solution",
  "function_name": "solve",
  "complete_code": "import sys\\nfrom typing import List\\n\\nclass Solution:\\n    def solve(self):\\n        # Implementation here\\n        pass\\n\\ndef main():\\n    solution = Solution()\\n    # Read input and call solve\\n    pass\\n\\nif __name__ == '__main__':\\n    main()",
  "test_cases": [
    {
      "input": "test input string",
      "expected_output": "expected output string",
      "description": "test case description"
    }
  ],
  "explanation": "Brief solution explanation",
  "time_complexity": "O(n) - explanation",
  "space_complexity": "O(1) - explanation", 
  "input_format": "Input format description",
  "output_format": "Output format description"
}

Python Code Requirements:
- Read from stdin using input() or sys.stdin
- Write to stdout using print()
- Handle dynamic input (not hardcoded values)
- Include proper error handling
- Use Python 3.x syntax
- Follow PEP 8 style guidelines
- Provide 2-3 diverse test cases

RESPOND WITH ONLY THE JSON OBJECT - NO OTHER TEXT`;
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

// Function to call Groq API
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
          content: 'You are a Python programming expert. Always return ONLY valid JSON objects with properly escaped strings. Never include markdown formatting, explanatory text, or comments. Ensure all newlines are \\n, tabs are \\t, quotes are \\", and backslashes are \\\\ in JSON string values.'
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
  console.log('Response preview:', content.substring(0, 300) + '...');
  
  // Extract JSON from the response
  content = extractJSON(content);
  console.log('Extracted JSON length:', content.length);
  
  try {
    // Use the improved JSON parsing function
    const parsed = cleanAndParseJSON(content);
    console.log('Successfully parsed Groq JSON response');
    
    // Validate that all required fields are present
    const requiredFields = [
      'class_name', 'function_name', 'complete_code', 'test_cases',
      'explanation', 'time_complexity', 'space_complexity', 'input_format', 'output_format'
    ];
    
    for (const field of requiredFields) {
      if (!(field in parsed)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    // Validate test_cases structure
    if (!Array.isArray(parsed.test_cases) || parsed.test_cases.length === 0) {
      throw new Error('test_cases must be a non-empty array');
    }
    
    const testCaseFields = ['input', 'expected_output', 'description'];
    for (let i = 0; i < parsed.test_cases.length; i++) {
      const testCase = parsed.test_cases[i];
      if (!testCase || typeof testCase !== 'object') {
        throw new Error(`test_cases[${i}] must be an object`);
      }
      for (const field of testCaseFields) {
        if (!(field in testCase) || typeof testCase[field] !== 'string') {
          throw new Error(`Missing or invalid test_cases[${i}].${field}`);
        }
      }
    }
    
    console.log('Groq response validation successful');
    return parsed as GroqCodeResponse;
    
  } catch (parseError) {
    console.error('JSON parsing failed:', parseError);
    console.error('Content that failed to parse (first 1000 chars):', content.substring(0, 1000));
    console.error('Content that failed to parse (last 1000 chars):', content.substring(Math.max(0, content.length - 1000)));
    
    throw new Error(`Failed to parse Groq response as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`);
  }
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
      const groqResponse = await callGroqAPI(prompt);

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
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const groqApiKey = process.env.JAVA_CODE_GROQ_API_KEY!;

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
interface JavaCodeRecord {
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

    if (existingRecord && existingRecord.coding_java) {
      // If coding_java is a number, increment it by 1
      if (typeof existingRecord.coding_java === 'number') {
        nextQuestionNumber = existingRecord.coding_java + 1;
      } 
      // If it's an array (legacy), get the max and increment
      else if (Array.isArray(existingRecord.coding_java) && existingRecord.coding_java.length > 0) {
        const maxQuestionNumber = Math.max(...existingRecord.coding_java);
        nextQuestionNumber = maxQuestionNumber + 1;
      }
    }

    return nextQuestionNumber;
  } catch (error) {
    console.error('Error in getNextQuestionNumber:', error);
    throw error;
  }
}

// Function to safely clean JSON string content
function cleanJsonString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/"/g, '\\"')    // Escape quotes
    .replace(/\n/g, '\\n')   // Escape newlines
    .replace(/\r/g, '\\r')   // Escape carriage returns
    .replace(/\t/g, '\\t')   // Escape tabs
    .replace(/\f/g, '\\f')   // Escape form feeds
    .replace(/\b/g, '\\b')   // Escape backspaces
    .replace(/[\x00-\x1F\x7F]/g, ''); // Remove other control characters
}

// Function to extract and clean JSON from Groq response
function extractAndCleanJson(content: string): string {
  let cleanedContent = content.trim();
  
  // Remove markdown code blocks
  if (cleanedContent.includes('```json')) {
    const jsonMatch = cleanedContent.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      cleanedContent = jsonMatch[1].trim();
    }
  } else if (cleanedContent.includes('```')) {
    const codeMatch = cleanedContent.match(/```\s*([\s\S]*?)\s*```/);
    if (codeMatch) {
      cleanedContent = codeMatch[1].trim();
    }
  }

  // Find JSON boundaries
  const jsonStart = cleanedContent.indexOf('{');
  const jsonEnd = cleanedContent.lastIndexOf('}');
  
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    cleanedContent = cleanedContent.substring(jsonStart, jsonEnd + 1);
  }

  return cleanedContent;
}

// Alternative JSON parsing with better error handling
function parseGroqResponse(content: string): GroqCodeResponse {
  try {
    // First attempt: try parsing as-is
    const cleanedContent = extractAndCleanJson(content);
    return JSON.parse(cleanedContent);
  } catch (firstError) {
    console.log('First parse attempt failed, trying manual parsing...');
    
    try {
      // Second attempt: manual field extraction for cases where JSON is malformed
      const cleanedContent = extractAndCleanJson(content);
      
      // Try to fix common JSON issues
      let fixedContent = cleanedContent
        // Fix unescaped quotes in strings
        .replace(/"([^"]*)":\s*"([^"]*(?:\\.[^"]*)*)"/g, (match, key, value) => {
          const cleanedValue = cleanJsonString(value);
          return `"${key}": "${cleanedValue}"`;
        })
        // Fix array formatting
        .replace(/"\s*\[\s*/g, '": [')
        .replace(/\s*\]\s*"/g, ']"')
        // Fix object formatting
        .replace(/"\s*{\s*/g, '": {')
        .replace(/\s*}\s*"/g, '}"');

      return JSON.parse(fixedContent);
    } catch (secondError) {
      console.log('Second parse attempt failed, trying regex extraction...');
      
      // Third attempt: extract fields using regex patterns
      const extractField = (fieldName: string, content: string): string => {
        const patterns = [
          new RegExp(`"${fieldName}"\\s*:\\s*"([^"]*(?:\\\\.[^"]*)*)"`, 'i'),
          new RegExp(`"${fieldName}"\\s*:\\s*'([^']*(?:\\\\.[^']*)*)'`, 'i'),
          new RegExp(`${fieldName}\\s*:\\s*"([^"]*(?:\\\\.[^"]*)*)"`, 'i'),
        ];
        
        for (const pattern of patterns) {
          const match = content.match(pattern);
          if (match) {
            return match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
          }
        }
        return '';
      };

      const extractArray = (fieldName: string, content: string): any[] => {
        const pattern = new RegExp(`"${fieldName}"\\s*:\\s*\\[(.*?)\\]`, 's');
        const match = content.match(pattern);
        if (match) {
          try {
            return JSON.parse(`[${match[1]}]`);
          } catch {
            // If array parsing fails, return empty array
            return [];
          }
        }
        return [];
      };

      // Extract fields manually
      const extracted: GroqCodeResponse = {
        class_name: extractField('class_name', content) || 'Solution',
        function_name: extractField('function_name', content) || 'solve',
        complete_code: extractField('complete_code', content) || '// Code extraction failed',
        test_cases: extractArray('test_cases', content) || [],
        explanation: extractField('explanation', content) || 'Explanation not available',
        time_complexity: extractField('time_complexity', content) || 'Not specified',
        space_complexity: extractField('space_complexity', content) || 'Not specified',
        input_format: extractField('input_format', content) || 'Not specified',
        output_format: extractField('output_format', content) || 'Not specified'
      };

      // Validate that we have the essential fields
      if (!extracted.complete_code || extracted.complete_code === '// Code extraction failed') {
        throw new Error('Failed to extract code from Groq response');
      }

      return extracted;
    }
  }
}

// Groq API prompt template for generating dynamic Java code
const createGroqPrompt = (question: string, approach: string): string => {
  return `Generate a complete, runnable Java solution for this coding question. Return ONLY a valid JSON object.

Question: ${question}
Approach: ${approach}

CRITICAL: Return valid JSON with properly escaped strings. Use \\n for newlines, \\" for quotes, \\\\ for backslashes.

Required JSON format (ensure ALL strings are properly escaped):
{
  "class_name": "Solution",
  "function_name": "solve",
  "complete_code": "import java.util.*;\\nimport java.io.*;\\n\\npublic class Solution {\\n    public static void main(String[] args) {\\n        Scanner sc = new Scanner(System.in);\\n        Solution sol = new Solution();\\n        \\n        // Read input and process\\n        // Print result\\n    }\\n    \\n    public returnType solve(parameters) {\\n        // Implementation\\n        return result;\\n    }\\n}",
  "test_cases": [
    {
      "input": "test input",
      "expected_output": "expected output",
      "description": "test description"
    }
  ],
  "explanation": "Solution explanation",
  "time_complexity": "Time complexity",
  "space_complexity": "Space complexity",
  "input_format": "Input format description",
  "output_format": "Output format description"
}

IMPORTANT: 
- Escape ALL special characters in strings (\\n, \\", \\\\, \\t)
- Ensure the JSON is valid and parseable
- The complete_code should be a single escaped string
- Include 2-3 comprehensive test cases
- Code should read from stdin and write to stdout`;
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
          content: 'You are a Java programming expert. CRITICAL: Always return valid JSON with properly escaped strings. Use \\n for newlines, \\" for quotes, \\\\ for backslashes in JSON strings. Never include code blocks or extra text.'
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
    throw new Error(`Groq API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error('Invalid Groq API response structure');
  }

  const content = data.choices[0].message.content.trim();
  console.log('Raw Groq response (first 200 chars):', content.substring(0, 200));

  try {
    const parsed = parseGroqResponse(content);
    
    // Validate that all required fields are present
    const requiredFields = [
      'class_name', 'function_name', 'complete_code', 'test_cases',
      'explanation', 'time_complexity', 'space_complexity', 'input_format', 'output_format'
    ];
    
    for (const field of requiredFields) {
      if (!(field in parsed)) {
        console.warn(`Missing required field: ${field}, using default value`);
        // Provide default values for missing fields
        switch (field) {
          case 'class_name':
            (parsed as any)[field] = 'Solution';
            break;
          case 'function_name':
            (parsed as any)[field] = 'solve';
            break;
          case 'test_cases':
            (parsed as any)[field] = [];
            break;
          default:
            (parsed as any)[field] = 'Not specified';
        }
      }
    }
    
    // Validate test_cases structure
    if (!Array.isArray(parsed.test_cases)) {
      console.warn('test_cases is not an array, using empty array');
      parsed.test_cases = [];
    }
    
    // Ensure each test case has required fields
    const testCaseFields: (keyof GroqCodeResponse['test_cases'][0])[] = ['input', 'expected_output', 'description'];
    parsed.test_cases = parsed.test_cases.filter((testCase, i) => {
      if (!testCase || typeof testCase !== 'object') {
        console.warn(`test_cases[${i}] is not a valid object, removing`);
        return false;
      }
      
      // Add missing fields with defaults
      for (const field of testCaseFields) {
        if (!(field in testCase)) {
          console.warn(`Missing test_cases[${i}].${field}, adding default`);
          (testCase as any)[field] = field === 'input' ? '1' : 
                                    field === 'expected_output' ? '1' : 'Test case';
        }
      }
      return true;
    });
    
    // If no valid test cases, add a default one
    if (parsed.test_cases.length === 0) {
      parsed.test_cases = [{
        input: '1',
        expected_output: '1',
        description: 'Default test case'
      }];
    }
    
    return parsed as GroqCodeResponse;
  } catch (parseError) {
    console.error('All parsing attempts failed');
    console.error('Raw Groq response:', content);
    console.error('Parse error:', parseError);
    
    // Return a fallback response instead of throwing
    return {
      class_name: 'Solution',
      function_name: 'solve',
      complete_code: `// Parsing failed - manual implementation required\n// Original response: ${content.substring(0, 100)}...`,
      test_cases: [{
        input: '1',
        expected_output: '1',
        description: 'Default test case - manual implementation required'
      }],
      explanation: 'Code generation failed due to JSON parsing error',
      time_complexity: 'Not specified',
      space_complexity: 'Not specified',
      input_format: 'Not specified',
      output_format: 'Not specified'
    };
  }
}

// GET handler for App Router
export async function GET(request: NextRequest) {
  try {
    // Extract api_key from URL search params
    const { searchParams } = new URL(request.url);
    const api_key = searchParams.get('api_key');

    // Validate API key
    if (!api_key || api_key !== process.env.API_KEY) {
      return Response.json({ error: 'Invalid or missing API key' }, { status: 401 });
    }

    // Step 1: Get the next question number automatically
    const questionNumber = await getNextQuestionNumber();

    // Step 2: Fetch question from codingquestionrepo table
    const { data: questionData, error: fetchError } = await supabase
      .from('codingquestionrepo')
      .select('sr_no, question, approach')
      .eq('sr_no', questionNumber)
      .single();

    if (fetchError || !questionData) {
      return Response.json({ 
        error: 'Question not found', 
        details: `No question found with sr_no: ${questionNumber}`,
        next_question_number: questionNumber 
      }, { status: 404 });
    }

    // Step 3: Check if code already exists
    const { data: existingCode } = await supabase
      .from('java_code')
      .select('*')
      .eq('sr_no', questionNumber)
      .single();

    let codeResult: JavaCodeRecord;

    if (existingCode) {
      // Return existing code and still update questions_done table
      codeResult = existingCode;
      
      // Update questions_done table for coding_java
      try {
        await updateQuestionsDoneTable(questionNumber, 'coding_java');
        console.log('Successfully updated questions_done table with existing code');
      } catch (updateError) {
        console.error('Failed to update questions_done table:', updateError);
        // Don't fail the entire request, just log the error
      }
    } else {
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

      // Step 6: Store code in java_code table
      const { error: insertError } = await supabase
        .from('java_code')
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

      // Step 7: Update questions_done table for coding_java
      try {
        await updateQuestionsDoneTable(questionNumber, 'coding_java');
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

    return Response.json({
      success: true,
      data: responseData,
      question_number: questionNumber,
      message: existingCode ? 'Retrieved existing code and updated questions_done' : 'Generated new code and updated questions_done'
    }, { status: 200 });

  } catch (error) {
    console.error('API Error:', error);
    return Response.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
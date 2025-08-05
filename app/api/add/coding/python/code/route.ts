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

// Groq API prompt template for generating dynamic Python code
const createGroqPrompt = (question: string, approach: string): string => {
  return `Generate a complete, runnable Python solution for this coding question that reads input from stdin and writes output to stdout. Return ONLY a valid JSON object with no additional text.

Question: ${question}
Approach: ${approach}

Requirements:
- Create a Python solution that reads input from sys.stdin or input()
- Write output to stdout using print()
- The solution should work like LeetCode - read dynamic input, process it, output result
- Include multiple test cases with different inputs
- The code must be testable with Piston API
- Use proper Python naming conventions (snake_case)
- Handle edge cases appropriately
- Use Python 3.x syntax

Required JSON format:
{
  "class_name": "Solution",
  "function_name": "solve",
  "complete_code": "import sys\nfrom typing import List, Optional\n\nclass Solution:\n    def solve(self, *args):\n        # Solution implementation\n        pass\n\ndef main():\n    solution = Solution()\n    \n    # Read input from stdin\n    # Process and call solve method\n    # Print result to stdout\n    \nif __name__ == '__main__':\n    main()",
  "test_cases": [
    {
      "input": "exact input string that will be passed to stdin",
      "expected_output": "exact expected output string",
      "description": "what this test case validates"
    },
    {
      "input": "another test input",
      "expected_output": "another expected output", 
      "description": "edge case or different scenario"
    }
  ],
  "explanation": "Brief explanation of the solution approach (max 150 words)",
  "time_complexity": "Time complexity with brief explanation",
  "space_complexity": "Space complexity with brief explanation",
  "input_format": "Description of input format (e.g., 'First line: n (integer), Second line: n space-separated integers')",
  "output_format": "Description of output format (e.g., 'Single integer representing the result')"
}

Important Guidelines:
- The main function should read from stdin using input() or sys.stdin and write to stdout using print()
- Do NOT hardcode test values in the main function
- The code should handle input exactly as described in input_format
- Output should match exactly as described in output_format
- Provide at least 2-3 diverse test cases
- Each test case input should be the exact string that gets passed to stdin
- Each expected output should be the exact string expected from stdout
- Make the code robust and handle typical constraints
- Use standard Python libraries (sys, typing, collections, etc.)
- Use Python 3.x features and syntax
- Follow PEP 8 style guidelines
- Return ONLY the JSON object`;
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
          content: 'You are a Python programming expert specializing in competitive programming and LeetCode-style problems. Always respond with valid JSON only. Create complete, runnable Python code that reads from stdin and writes to stdout, suitable for automated testing platforms like Piston API. Use Python 3.x syntax and follow PEP 8 guidelines.'
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

  let content = data.choices[0].message.content.trim();
  
  // Clean up the response - remove any markdown code blocks or extra text
  if (content.includes('```json')) {
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      content = jsonMatch[1].trim();
    }
  } else if (content.includes('```')) {
    const codeMatch = content.match(/```\s*([\s\S]*?)\s*```/);
    if (codeMatch) {
      content = codeMatch[1].trim();
    }
  }

  // Remove any leading/trailing text that's not JSON
  const jsonStart = content.indexOf('{');
  const jsonEnd = content.lastIndexOf('}');
  
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    content = content.substring(jsonStart, jsonEnd + 1);
  }

  try {
    const parsed = JSON.parse(content);
    
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
        if (!(field in testCase)) {
          throw new Error(`Missing test_cases[${i}].${field}`);
        }
      }
    }
    
    return parsed as GroqCodeResponse;
  } catch (parseError) {
    console.error('Raw Groq response:', content);
    console.error('Parse error:', parseError);
    throw new Error(`Failed to parse Groq response as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
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
      .from('python_code')
      .select('*')
      .eq('sr_no', questionNumber)
      .single();

    let codeResult: PythonCodeRecord;

    if (existingCode) {
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

    return Response.json({
      success: true,
      data: responseData,
      question_number: questionNumber,
      message: existingCode ? 'Retrieved existing Python code and updated questions_done' : 'Generated new Python code and updated questions_done'
    }, { status: 200 });

  } catch (error) {
    console.error('API Error:', error);
    return Response.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
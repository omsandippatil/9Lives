import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const groqApiKey = process.env.GROQ_API_KEY!;

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Interface for the coding question
interface CodingQuestion {
  sr_no: number;
  question: string;
  approach: string;
}

// Interface for Groq response structure
interface GroqAnalysis {
  explanation: string;
  approach_details: string;
  pseudo_code: string[];
  syntax_explanation: { [key: string]: string };
  key_insights: string;
  when_to_use: string;
  time_complexity: string;
  space_complexity: string;
}

// Interface for the final stored analysis
interface QuestionAnalysis {
  sr_no: number;
  question: string;
  approach: string;
  explanation: string;
  approach_details: string;
  pseudo_code: string[];
  syntax_explanation: { [key: string]: string };
  key_insights: string;
  when_to_use: string;
  time_complexity: string;
  space_complexity: string;
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

    if (existingRecord && existingRecord.coding_theory_java) {
      // If coding_theory_java is a number, increment it by 1
      if (typeof existingRecord.coding_theory_java === 'number') {
        nextQuestionNumber = existingRecord.coding_theory_java + 1;
      } 
      // If it's an array (legacy), get the max and increment
      else if (Array.isArray(existingRecord.coding_theory_java) && existingRecord.coding_theory_java.length > 0) {
        const maxQuestionNumber = Math.max(...existingRecord.coding_theory_java);
        nextQuestionNumber = maxQuestionNumber + 1;
      }
    }

    return nextQuestionNumber;
  } catch (error) {
    console.error('Error in getNextQuestionNumber:', error);
    throw error;
  }
}

// Simplified Groq API prompt template
const createGroqPrompt = (question: string, approach: string): string => {
  return `Analyze this Java coding question and approach. Return ONLY a valid JSON object with no additional text.

Question: ${question}
Approach: ${approach}

Required JSON format:
{
  "explanation": "Detailed explanation with concrete example and step-by-step breakdown (max 200 words)",
  "approach_details": "In-depth explanation of why this approach works, its advantages, and technical details (max 250 words)",
  "pseudo_code": ["Step 1 description (6-7 words)", "Step 2 description (6-7 words)", "Step 3 description (6-7 words)", "Step 4 description (6-7 words)", "Step 5 description (6-7 words)", "Step 6 description (6-7 words)"],
  "syntax_explanation": {
    "method_name_1": "simple explanation of what it does",
    "method_name_2": "simple explanation of what it does",
    "concept_1": "simple explanation of what it does",
    "concept_2": "simple explanation of what it does"
  },
  "key_insights": "Deep insights and important gotchas about this solution (max 150 words)",
  "when_to_use": "Specific scenarios when to use this approach (max 150 words)",
  "time_complexity": "Time complexity with explanation (max 100 words)",
  "space_complexity": "Space complexity with explanation (max 100 words)"
}

Requirements:
- pseudo_code must be exactly 6 elements, each 6-7 words
- syntax_explanation should include Java methods, concepts, or syntax used in this solution
- Each syntax item should be: "syntax_name": "simple explanation of what it does"
- Focus on actual Java syntax/methods used in the solution
- Return ONLY the JSON object`;
};

// Function to update questions_done table - simply replace with current question number
async function updateQuestionsDoneTable(questionNumber: number, category: 'coding_theory_java' | 'coding_java' | 'coding_theory_python' | 'coding_python') {
  try {
    console.log(`Starting updateQuestionsDoneTable - Question: ${questionNumber}, Category: ${category}`);

    // Simply set the current question number as the value
    const updatedRecord = {
      [category]: questionNumber // Just store the current question number
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
async function callGroqAPI(prompt: string): Promise<GroqAnalysis> {
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
          content: 'You are a Java programming expert. Always respond with valid JSON only. Provide simple, clear explanations.'
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
      'explanation', 'approach_details', 'pseudo_code', 'syntax_explanation',
      'key_insights', 'when_to_use', 'time_complexity', 'space_complexity'
    ];
    
    for (const field of requiredFields) {
      if (!(field in parsed)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    // Ensure pseudo_code is an array
    if (!Array.isArray(parsed.pseudo_code)) {
      throw new Error('pseudo_code must be an array');
    }
    
    // Ensure syntax_explanation is an object
    if (typeof parsed.syntax_explanation !== 'object' || Array.isArray(parsed.syntax_explanation)) {
      throw new Error('syntax_explanation must be an object');
    }
    
    return parsed as GroqAnalysis;
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

    // Step 3: Check if analysis already exists
    const { data: existingAnalysis } = await supabase
      .from('java_coding_theory')
      .select('*')
      .eq('sr_no', questionNumber)
      .single();

    let analysisResult: QuestionAnalysis;

    if (existingAnalysis) {
      // Return existing analysis and still update questions_done table
      analysisResult = existingAnalysis;
      
      // Update questions_done table for coding_theory_java
      try {
        await updateQuestionsDoneTable(questionNumber, 'coding_theory_java');
        console.log('Successfully updated questions_done table with existing analysis');
      } catch (updateError) {
        console.error('Failed to update questions_done table:', updateError);
        // Don't fail the entire request, just log the error
      }
    } else {
      // Step 4: Generate Groq prompt and call API
      const prompt = createGroqPrompt(questionData.question, questionData.approach);
      const groqResponse = await callGroqAPI(prompt);

      // Step 5: Prepare data for storage
      analysisResult = {
        sr_no: questionData.sr_no,
        question: questionData.question,
        approach: questionData.approach,
        explanation: groqResponse.explanation,
        approach_details: groqResponse.approach_details,
        pseudo_code: groqResponse.pseudo_code,
        syntax_explanation: groqResponse.syntax_explanation,
        key_insights: groqResponse.key_insights,
        when_to_use: groqResponse.when_to_use,
        time_complexity: groqResponse.time_complexity,
        space_complexity: groqResponse.space_complexity,
        created_at: new Date().toISOString(),
      };

      // Step 6: Store analysis in java_coding_theory table
      const { error: insertError } = await supabase
        .from('java_coding_theory')
        .insert(analysisResult);

      if (insertError) {
        console.error('Error storing analysis:', insertError);
        return Response.json({ error: 'Failed to store analysis' }, { status: 500 });
      }

      // Step 7: Update questions_done table for coding_theory_java (add the question number to array)
      try {
        await updateQuestionsDoneTable(questionNumber, 'coding_theory_java');
        console.log('Successfully updated questions_done table with new analysis');
      } catch (updateError) {
        console.error('Failed to update questions_done table:', updateError);
        // Don't fail the entire request, just log the error
      }
    }

    // Step 8: Return the complete analysis
    return Response.json({
      success: true,
      data: analysisResult,
      question_number: questionNumber,
      message: existingAnalysis ? 'Retrieved existing analysis and updated questions_done' : 'Generated new analysis and updated questions_done'
    }, { status: 200 });

  } catch (error) {
    console.error('API Error:', error);
    return Response.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
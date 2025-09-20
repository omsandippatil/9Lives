import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase client configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Groq API configuration
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.HR_GROQ_API_KEY;

interface QuestionData {
  id: number;
  topic_name: string;
  question: string;
  formula_or_logic?: string;
  options: string[];
  explanation?: string;
  tags?: string[];
}

interface GroqResponse {
  topic_name: string;
  question: string;
  formula_or_logic: string;
  options: string[];
  explanation: string;
  tags: string[];
}

export async function GET(request: NextRequest) {
  try {
    // Check API key
    const apiKey = request.nextUrl.searchParams.get('api_key');
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Get current question number from questions_done table
    const { data: questionDoneData, error: questionDoneError } = await supabase
      .from('questions_done')
      .select('aptitude_questions')
      .eq('id', 1)
      .single();

    if (questionDoneError || !questionDoneData) {
      console.error('Questions done error:', questionDoneError);
      return NextResponse.json({ error: 'Questions done record not found' }, { status: 404 });
    }

    // Get the next question to process (current + 1)
    const nextQuestionId = questionDoneData.aptitude_questions + 1;

    // Fetch the next question from aptitude_questions table
    const { data: questionData, error: questionError } = await supabase
      .from('aptitude_questions')
      .select('id, topic_name, question, formula_or_logic, options, explanation, tags')
      .eq('id', nextQuestionId)
      .single();

    if (questionError || !questionData) {
      console.error('Question error:', questionError);
      return NextResponse.json({ error: `Question with ID ${nextQuestionId} not found` }, { status: 404 });
    }

    const correctAnswer = Array.isArray(questionData.options) ? questionData.options[0] : questionData.options;

    // Precise prompt for Groq API
    const groqPrompt = `Enhance this question with detailed explanation. Respond with valid JSON only.

Topic: ${questionData.topic_name}
Question: ${questionData.question}
Correct Answer: ${correctAnswer}

Use this exact JSON template:
{
  "topic_name": "${questionData.topic_name}",
  "question": "${questionData.question}",
  "formula_or_logic": "Formulas: $formula_1$, $formula_2$",...,
  "options": ["${correctAnswer}", "wrong_option_1", "wrong_option_2", "wrong_option_3"],
  "explanation": "## Concept Overview\\nBrief intro\\n\\n## Key Formulas\\n$Primary Formula$\\n$Secondary Formula$\\n\\n## Step-by-Step Solution\\n### Step 1: Analysis\\n- What is given\\n- What to find\\n\\n### Step 2: Apply Formula\\n- Use: $formula$\\n- Substitute values\\n\\n### Step 3: Calculate\\n- Show work\\n- Intermediate steps\\n\\n### Step 4: Verify\\n- Check answer\\n\\n## Worked Example\\nSimilar problem with complete solution\\n\\n## Tips & Tricks\\n- **Strategy**: Main approach\\n- **Pitfalls**: Common mistakes\\n- **Shortcuts**: Quick methods\\n\\n## Alternative Methods\\nOther solving approaches",
  "tags": ["topic", "difficulty", "formula_type", "category", "exam"]
}`;

    // Call Groq API with corrected model name and increased token limit
    const groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile', // Fixed: Using correct Groq model name
        messages: [
          {
            role: 'user',
            content: groqPrompt
          }
        ],
        temperature: 0.1, // Already at 0.1 as requested
        max_tokens: 8000, // Increased from 4000 to 8000
        response_format: { type: "json_object" },
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('Groq API error response:', errorText);
      throw new Error(`Groq API error: ${groqResponse.status} ${groqResponse.statusText} - ${errorText}`);
    }

    const groqData = await groqResponse.json();
    const aiContent = groqData.choices[0]?.message?.content;

    if (!aiContent) {
      throw new Error('No response from Groq API');
    }

    // Parse AI response with better JSON extraction
    let enhancedQuestion: GroqResponse;
    try {
      console.log('Raw AI Response:', aiContent);
      
      // Multiple attempts to extract JSON
      let jsonString = aiContent;
      
      // Remove markdown code blocks
      jsonString = jsonString.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      // Try to find JSON object boundaries
      const jsonStart = jsonString.indexOf('{');
      const jsonEnd = jsonString.lastIndexOf('}') + 1;
      
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        jsonString = jsonString.substring(jsonStart, jsonEnd);
      }
      
      // Clean up any remaining markdown or extra text
      jsonString = jsonString.trim();
      
      // Remove any text before the first { or after the last }
      const firstBrace = jsonString.indexOf('{');
      const lastBrace = jsonString.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        jsonString = jsonString.substring(firstBrace, lastBrace + 1);
      }
      
      console.log('Cleaned JSON:', jsonString);
      
      enhancedQuestion = JSON.parse(jsonString);
      
      // Validate required fields
      if (!enhancedQuestion.topic_name || !enhancedQuestion.question || !enhancedQuestion.options) {
        throw new Error('Missing required fields in AI response');
      }
      
    } catch (parseError) {
      console.error('Failed to parse Groq response:', aiContent);
      console.error('Parse error:', parseError);
      
      // Try one more time with even more aggressive cleaning
      try {
        let lastTry = aiContent;
        // Remove everything before first { and after last }
        const firstBrace = lastTry.indexOf('{');
        const lastBrace = lastTry.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          lastTry = lastTry.substring(firstBrace, lastBrace + 1);
          enhancedQuestion = JSON.parse(lastTry);
        } else {
          throw new Error('No valid JSON structure found');
        }
      } catch (secondError) {
        throw new Error(`Invalid JSON response from AI. Raw response: ${aiContent.substring(0, 500)}...`);
      }
    }

    // Update the aptitude_questions table with enhanced data
    const { error: updateError } = await supabase
      .from('aptitude_questions')
      .update({
        formula_or_logic: enhancedQuestion.formula_or_logic,
        options: enhancedQuestion.options,
        explanation: enhancedQuestion.explanation,
        tags: enhancedQuestion.tags
      })
      .eq('id', nextQuestionId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error('Failed to update question');
    }

    // Increment the questions_done counter to the next question
    const { error: incrementError } = await supabase
      .from('questions_done')
      .update({
        aptitude_questions: nextQuestionId
      })
      .eq('id', 1);

    if (incrementError) {
      console.error('Increment error:', incrementError);
      throw new Error('Failed to increment question counter');
    }

    return NextResponse.json({
      success: true,
      message: 'Question enhanced and updated successfully',
      questionId: nextQuestionId,
      updatedData: {
        topic_name: enhancedQuestion.topic_name,
        question: enhancedQuestion.question,
        formula_or_logic: enhancedQuestion.formula_or_logic,
        options: enhancedQuestion.options,
        explanation: enhancedQuestion.explanation,
        tags: enhancedQuestion.tags
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

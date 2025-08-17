import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.TECHQ_GROQ_API_KEY!,
});

interface TechnicalQuestion {
  id: number;
  question: string;
  difficulty_level?: string;
  category?: string;
  technology_stack?: string;
  answer?: string;
  created_at?: string;
}

interface QuestionsCounter {
  technical_questions: number;
}

// Enhanced prompt for generating comprehensive technical answers
const createTechnicalPrompt = (question: string) => `
You are a world-class technical expert and senior software architect with 15+ years of experience. You will generate an EXTREMELY COMPREHENSIVE and DETAILED answer for this technical interview question.

**Question**: "${question}"

## ANSWER FORMAT REQUIREMENTS:

Your response MUST follow this exact structure and format:

### 🎯 1. IMMEDIATE INTERVIEW ANSWER
First, provide a direct, concise, and professional answer exactly as you would give it in a real technical interview. This should be 2-3 paragraphs that directly address the question with key points an interviewer expects to hear. This is your elevator pitch answer.

### 📚 2. COMPREHENSIVE TECHNICAL EXPLANATION
After the interview answer, provide a detailed breakdown and explanation. Let the content naturally organize itself based on what's most important for understanding this concept. You decide the headings and structure based on what makes the most sense for this specific question.

## SPECIFIC REQUIREMENTS:
- **IMPORTANT**: Add one appropriate emoji at the start of EVERY heading (including sub-headings) to make the content more visually engaging
- Use tables wherever they would help organize and display information clearly
- Use analogies to explain complex concepts in simple terms
- Include practical code examples with detailed explanations
- Cover multiple programming languages where applicable
- Provide real-world implementation scenarios
- Include performance considerations and optimization strategies
- Address common pitfalls and how to avoid them
- Explain related concepts that build understanding
- Use proper markdown formatting for readability
- Make each section substantial with practical examples and actionable insights

## STRUCTURE GUIDELINES:
- Start with the direct interview answer (with emoji)
- Then organize the detailed explanation logically
- Use headings that make sense for the specific topic (ALL with appropriate emojis)
- Include tables for comparisons, data, or structured information
- Use analogies to make complex concepts accessible
- Provide comprehensive code examples
- Cover security, performance, and best practices
- Include real-world applications and case studies

Remember: First answer the question as you would in an interview, then provide the comprehensive learning material. Let the content dictate the organization and headings naturally. ALWAYS add appropriate emojis to ALL headings and sub-headings.
`;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('api_key');
    const forceRegenerate = searchParams.get('regenerate') === 'true';
    
    // Validate API key
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return NextResponse.json(
        { error: 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    // Step 1: Get current questions counter
    const { data: counterData, error: counterError } = await supabase
      .from('questions_done')
      .select('technical_question')
      .single();

    if (counterError) {
      console.error('Error fetching counter:', counterError);
      return NextResponse.json(
        { error: 'Failed to fetch question counter' },
        { status: 500 }
      );
    }

    const currentCount = counterData.technical_question || 0;
    const nextQuestionId = currentCount + 1;

    // Step 2: Get the next question
    let query = supabase
      .from('technical_questions')
      .select('*');

    if (!forceRegenerate) {
      query = query.is('answer', null).limit(1);
    } else {
      query = query.eq('id', nextQuestionId);
    }

    const { data: questionsData, error: questionError } = await query;

    if (questionError || !questionsData || questionsData.length === 0) {
      console.error('Error fetching question:', questionError);
      return NextResponse.json(
        { error: 'No more questions available or question not found' },
        { status: 404 }
      );
    }

    const question = questionsData[0] as TechnicalQuestion;

    // Step 3: Generate comprehensive technical answer using Groq
    const prompt = createTechnicalPrompt(question.question);

    console.log('Generating answer for question:', question.id);

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a world-class technical expert and senior software architect. You provide comprehensive, interview-ready explanations that serve as definitive technical guides. Always start with a direct interview answer, then provide detailed explanations with natural organization, tables where helpful, and analogies to clarify concepts. IMPORTANT: Add appropriate emojis at the start of ALL headings and sub-headings to make the content visually engaging."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      max_tokens: 8192,
    });

    const generatedAnswer = completion.choices[0]?.message?.content || '';

    // Step 4: Save the comprehensive answer
    const { error: updateError } = await supabase
      .from('technical_questions')
      .update({ 
        answer: generatedAnswer
      })
      .eq('id', question.id);

    if (updateError) {
      console.error('Error updating question with answer:', updateError);
      return NextResponse.json(
        { error: 'Failed to save answer' },
        { status: 500 }
      );
    }

    // Step 5: Update counter only if processing sequentially
    if (!forceRegenerate && question.id === nextQuestionId) {
      const { error: incrementError } = await supabase
        .from('questions_done')
        .update({ 
          technical_question: question.id
        })
        .eq('technical_questions', currentCount);

      if (incrementError) {
        console.error('Error incrementing counter:', incrementError);
      }
    }

    return NextResponse.json({
      success: true,
      questionId: question.id,
      question: question.question,
      category: question.category,
      difficulty: question.difficulty_level,
      technology_stack: question.technology_stack,
      answer: generatedAnswer,
      previousCount: currentCount,
      newCount: question.id,
      answerLength: generatedAnswer.length,
      wordCount: generatedAnswer.split(' ').length,
      estimatedReadTime: Math.ceil(generatedAnswer.split(' ').length / 200),
      message: 'Comprehensive technical answer generated and saved successfully'
    });

  } catch (error) {
    console.error('GET API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST method for targeted question processing
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('api_key');
    
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return NextResponse.json(
        { error: 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { questionId, questionIds, batchSize = 5 } = body;
    
    // Handle batch processing
    if (questionIds && Array.isArray(questionIds)) {
      const results = [];
      
      for (const id of questionIds.slice(0, batchSize)) {
        try {
          const result = await processQuestion(id);
          results.push(result);
        } catch (error) {
          results.push({
            questionId: id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      return NextResponse.json({
        success: true,
        batchResults: results,
        processedCount: results.filter(r => r.success).length,
        totalRequested: questionIds.length,
        message: `Processed ${results.filter(r => r.success).length} out of ${questionIds.length} questions`
      });
    }

    // Handle single question processing
    if (questionId) {
      const result = await processQuestion(questionId);
      return NextResponse.json(result);
    }

    // Handle processing unanswered questions
    let query = supabase
      .from('technical_questions')
      .select('id, question')
      .is('answer', null)
      .limit(batchSize);

    const { data: questions, error } = await query;

    if (error || !questions || questions.length === 0) {
      return NextResponse.json(
        { error: 'No unanswered questions found' },
        { status: 404 }
      );
    }

    const results = [];
    for (const q of questions) {
      try {
        const result = await processQuestion(q.id);
        results.push(result);
      } catch (error) {
        results.push({
          questionId: q.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      batchResults: results,
      processedCount: results.filter(r => r.success).length,
      message: `Processed ${results.filter(r => r.success).length} unanswered questions`
    });

  } catch (error) {
    console.error('POST API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helper function to process individual questions
async function processQuestion(questionId: number) {
  const { data: questionData, error: questionError } = await supabase
    .from('technical_questions')
    .select('*')
    .eq('id', questionId)
    .single();

  if (questionError || !questionData) {
    throw new Error(`Question ${questionId} not found`);
  }

  const question = questionData as TechnicalQuestion;
  
  const prompt = createTechnicalPrompt(question.question);

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "You are a world-class technical expert creating comprehensive interview preparation material. Always start with a direct interview answer, then provide detailed explanations with natural organization, tables where helpful, and analogies to clarify concepts. IMPORTANT: Add appropriate emojis at the start of ALL headings and sub-headings to make the content visually engaging."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    model: "llama-3.3-70b-versatile",
    temperature: 0.2,
    max_tokens: 8192,
  });

  const generatedAnswer = completion.choices[0]?.message?.content || '';

  // Save the answer
  const { error: updateError } = await supabase
    .from('technical_questions')
    .update({ 
      answer: generatedAnswer,
    })
    .eq('id', questionId);

  if (updateError) {
    throw new Error(`Failed to save answer for question ${questionId}`);
  }

  return {
    success: true,
    questionId,
    question: question.question,
    category: question.category,
    difficulty: question.difficulty_level,
    answerLength: generatedAnswer.length,
    wordCount: generatedAnswer.split(' ').length,
    estimatedReadTime: Math.ceil(generatedAnswer.split(' ').length / 200),
    message: 'Technical answer generated successfully'
  };
}

// PUT method for updating existing answers
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('api_key');
    
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return NextResponse.json(
        { error: 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    const { questionId, regenerateAnswer = false } = await request.json();
    
    if (!questionId) {
      return NextResponse.json(
        { error: 'Question ID is required' },
        { status: 400 }
      );
    }

    if (regenerateAnswer) {
      const result = await processQuestion(questionId);
      return NextResponse.json({
        ...result,
        message: 'Technical answer regenerated successfully'
      });
    }

    return NextResponse.json(
      { error: 'Specify regenerateAnswer: true to update existing answer' },
      { status: 400 }
    );

  } catch (error) {
    console.error('PUT API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
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
  apiKey: process.env.FUNDAQ_GROQ_API_KEY!,
});

interface FundamentalQuestion {
  id: number;
  question: string;
  difficulty_level?: string;
  category?: string;
  subject_area?: string;
  answer?: string;
  created_at?: string;
}

interface QuestionsCounter {
  fundamental_question: number;
}

// Enhanced prompt for generating comprehensive fundamental answers
const createFundamentalPrompt = (question: string) => `
You are a world-class educator and expert in fundamental concepts across multiple disciplines including computer science, mathematics, physics, engineering, and logic. You will generate an EXTREMELY COMPREHENSIVE and DETAILED answer for this fundamental question.

**Question**: "${question}"

## ANSWER FORMAT REQUIREMENTS:

Your response MUST follow this exact structure and format:

### 🎯 1. CORE CONCEPT EXPLANATION
Start with a clear, direct explanation of the fundamental concept. This should be accessible to someone learning the topic for the first time, yet comprehensive enough to serve as a definitive reference. Explain what it is, why it matters, and its significance in the broader field.

### 📚 2. DEEP DIVE ANALYSIS
After the core explanation, provide a detailed breakdown and comprehensive analysis. Let the content naturally organize itself based on what's most important for understanding this fundamental concept. You decide the headings and structure based on what makes the most sense for this specific question.

## SPECIFIC REQUIREMENTS:
- **IMPORTANT**: Add one appropriate emoji at the start of EVERY heading (including sub-headings) to make the content more visually engaging
- Use tables wherever they would help organize and display information clearly
- Use analogies and real-world examples to explain abstract concepts
- Include mathematical formulas, diagrams descriptions, or visual representations where applicable
- Cover historical context and evolution of the concept
- Provide step-by-step breakdowns for complex processes
- Include practical applications and real-world implementations
- Address common misconceptions and clarify confusing aspects
- Explain relationships to other fundamental concepts
- Use proper markdown formatting for maximum readability
- Make each section substantial with practical examples and clear explanations

## STRUCTURE GUIDELINES:
- Start with the core concept explanation (with emoji)
- Then organize the detailed analysis logically
- Use headings that make sense for the specific topic (ALL with appropriate emojis)
- Include tables for comparisons, classifications, or structured information
- Use analogies to make abstract concepts concrete and understandable
- Provide comprehensive examples and case studies
- Cover theoretical foundations and practical applications
- Include learning progression and prerequisite knowledge

Remember: First explain the fundamental concept clearly, then provide the comprehensive educational material. Let the content dictate the organization and headings naturally. ALWAYS add appropriate emojis to ALL headings and sub-headings.
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
      .select('fundamental_question')
      .single();

    if (counterError) {
      console.error('Error fetching counter:', counterError);
      return NextResponse.json(
        { error: 'Failed to fetch question counter' },
        { status: 500 }
      );
    }

    const currentCount = counterData.fundamental_question || 0;
    const nextQuestionId = currentCount + 1;

    // Step 2: Get the next question
    const { data: questionsData, error: questionError } = await supabase
      .from('fundamental_questions')
      .select('*')
      .eq('id', nextQuestionId)
      .single();

    if (questionError || !questionsData) {
      console.error('Error fetching question:', questionError);
      return NextResponse.json(
        { error: 'Question not found or no more questions available' },
        { status: 404 }
      );
    }

    const question = questionsData as FundamentalQuestion;

    // Step 3: Generate comprehensive fundamental answer using Groq
    const prompt = createFundamentalPrompt(question.question);

    console.log('Generating answer for fundamental question:', question.id);

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a world-class educator and expert in fundamental concepts across multiple disciplines. You provide comprehensive, educational explanations that serve as definitive learning guides. Always start with a clear core concept explanation, then provide detailed analysis with natural organization, tables where helpful, and analogies to clarify abstract concepts. IMPORTANT: Add appropriate emojis at the start of ALL headings and sub-headings to make the content visually engaging."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
      max_tokens: 8192,
    });

    const generatedAnswer = completion.choices[0]?.message?.content || '';

    // Step 4: Save the comprehensive answer
    const { error: updateError } = await supabase
      .from('fundamental_questions')
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

    // Step 5: Update counter after successful answer generation
    const { error: incrementError } = await supabase
      .from('questions_done')
      .update({ 
        fundamental_question: question.id
      })
      .eq('fundamental_question', currentCount);

    if (incrementError) {
      console.error('Error incrementing counter:', incrementError);
    }

    return NextResponse.json({
      success: true,
      questionId: question.id,
      question: question.question,
      category: question.category,
      difficulty: question.difficulty_level,
      subject_area: question.subject_area,
      answer: generatedAnswer,
      previousCount: currentCount,
      newCount: question.id,
      answerLength: generatedAnswer.length,
      wordCount: generatedAnswer.split(' ').length,
      estimatedReadTime: Math.ceil(generatedAnswer.split(' ').length / 200),
      message: 'Comprehensive fundamental answer generated and saved successfully'
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
        message: `Processed ${results.filter(r => r.success).length} out of ${questionIds.length} fundamental questions`
      });
    }

    // Handle single question processing
    if (questionId) {
      const result = await processQuestion(questionId);
      return NextResponse.json(result);
    }

    // Handle processing questions based on counter
    const { data: counterData, error: counterError } = await supabase
      .from('questions_done')
      .select('fundamental_question')
      .single();

    if (counterError) {
      return NextResponse.json(
        { error: 'Failed to fetch question counter' },
        { status: 500 }
      );
    }

    const currentCount = counterData.fundamental_question || 0;
    const startId = currentCount + 1;
    
    const { data: questions, error } = await supabase
      .from('fundamental_questions')
      .select('id, question')
      .gte('id', startId)
      .limit(batchSize);

    if (error || !questions || questions.length === 0) {
      return NextResponse.json(
        { error: 'No more fundamental questions found to process' },
        { status: 404 }
      );
    }

    const results = [];
    for (const q of questions) {
      try {
        const result = await processQuestion(q.id);
        results.push(result);
        
        // Update counter after each successful processing
        await supabase
          .from('questions_done')
          .update({ fundamental_question: q.id })
          .eq('fundamental_question', currentCount + results.length - 1);
          
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
      message: `Processed ${results.filter(r => r.success).length} unanswered fundamental questions`
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
    .from('fundamental_questions')
    .select('*')
    .eq('id', questionId)
    .single();

  if (questionError || !questionData) {
    throw new Error(`Fundamental question ${questionId} not found`);
  }

  const question = questionData as FundamentalQuestion;
  
  const prompt = createFundamentalPrompt(question.question);

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "You are a world-class educator creating comprehensive fundamental concept learning material. Always start with a clear core concept explanation, then provide detailed analysis with natural organization, tables where helpful, and analogies to clarify abstract concepts. IMPORTANT: Add appropriate emojis at the start of ALL headings and sub-headings to make the content visually engaging."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    model: "llama-3.3-70b-versatile",
    temperature: 0.3,
    max_tokens: 8192,
  });

  const generatedAnswer = completion.choices[0]?.message?.content || '';

  // Save the answer
  const { error: updateError } = await supabase
    .from('fundamental_questions')
    .update({ 
      answer: generatedAnswer,
    })
    .eq('id', questionId);

  if (updateError) {
    throw new Error(`Failed to save answer for fundamental question ${questionId}`);
  }

  return {
    success: true,
    questionId,
    question: question.question,
    category: question.category,
    difficulty: question.difficulty_level,
    subject_area: question.subject_area,
    answerLength: generatedAnswer.length,
    wordCount: generatedAnswer.split(' ').length,
    estimatedReadTime: Math.ceil(generatedAnswer.split(' ').length / 200),
    message: 'Fundamental answer generated successfully'
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
        message: 'Fundamental answer regenerated successfully'
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

// DELETE method for removing questions or resetting answers
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('api_key');
    
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return NextResponse.json(
        { error: 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    const { questionId, resetAnswer = false, resetCounter = false } = await request.json();
    
    if (resetCounter) {
      const { error: resetError } = await supabase
        .from('questions_done')
        .update({ fundamental_question: 0 });
      
      if (resetError) {
        throw new Error('Failed to reset counter');
      }
      
      return NextResponse.json({
        success: true,
        message: 'Fundamental questions counter reset to 0'
      });
    }
    
    if (resetAnswer && questionId) {
      const { error: resetError } = await supabase
        .from('fundamental_questions')
        .update({ answer: null })
        .eq('id', questionId);
      
      if (resetError) {
        throw new Error(`Failed to reset answer for question ${questionId}`);
      }
      
      return NextResponse.json({
        success: true,
        questionId,
        message: 'Answer reset successfully'
      });
    }

    return NextResponse.json(
      { error: 'Specify questionId with resetAnswer: true, or resetCounter: true' },
      { status: 400 }
    );

  } catch (error) {
    console.error('DELETE API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
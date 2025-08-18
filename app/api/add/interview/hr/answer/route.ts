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

interface HRQuestion {
  id: number;
  question: string;
  response?: string;
  created_at?: string;
}

interface QuestionsCounter {
  hr_question: number;
}

// Enhanced prompt for generating comprehensive HR answers for tech freshers
const createHRPrompt = (question: string) => `
You are an experienced career coach and HR advisor who specializes in helping fresh graduates and entry-level professionals navigate their early career in the tech/software industry. You understand the unique challenges, opportunities, and workplace dynamics that new tech professionals face. You will generate a COMPREHENSIVE and PRACTICAL answer tailored specifically for a fresher entering the tech industry.

**HR Question**: "${question}"

## ANSWER FORMAT REQUIREMENTS:

Your response MUST follow this exact structure and format:

### 🎯 1. DIRECT ANSWER FOR TECH FRESHERS
Start with a clear, direct response specifically tailored for someone who is new to the tech industry. Address the question from the perspective of a fresh graduate or early-career professional in software/tech, providing practical guidance they can immediately apply in their new role.

### 📝 2. TEMPLATE/SCRIPT TO USE
Provide an exact template, script, or example conversation that the tech fresher can use word-for-word or adapt for their specific situation. Include placeholders like [Your Name], [Specific Example], etc. where they need to customize. This should be copy-paste ready.

### ✅ 3. WHAT TO SAY (DO's)
List specific phrases, approaches, and communication strategies that work well in the tech industry. Explain WHY each approach is effective and what positive outcomes it creates. Include context about when and how to use each approach.

### ❌ 4. WHAT NOT TO SAY (DON'Ts)
List specific phrases, words, or approaches to avoid completely. For each DON'T, explain:
- WHY this is problematic in tech culture
- What negative impression it creates
- How it might impact their career or relationships
- What could go wrong if they say this

### 🔄 5. ALTERNATIVE APPROACHES
For each "what not to say" item, provide better alternatives. Show how to reframe negative approaches into positive, professional communication that aligns with tech industry expectations.

## SPECIFIC REQUIREMENTS:

- **IMPORTANT**: Add one appropriate emoji at the start of EVERY heading (including sub-headings) to make the content more visually engaging
- Focus specifically on tech industry context and software development environments
- Use tables for organizing DO's vs DON'Ts, comparisons, or decision-making frameworks
- Include real-world tech workplace scenarios and examples
- Provide step-by-step guidance tailored for someone with limited work experience
- Address common fresher concerns and anxieties in tech roles
- Include communication tips for working with senior developers, managers, and cross-functional teams
- Cover tech industry best practices and unwritten rules
- Address career growth and learning opportunities in tech
- Explain tech workplace culture and professional expectations
- Use proper markdown formatting for maximum readability
- Make each section substantial with practical examples and actionable advice for newcomers

## STRUCTURE GUIDELINES:

- Start with the direct answer specifically for tech freshers (with emoji)
- Always include a ready-to-use template or script section
- Create comprehensive DO's and DON'Ts with explanations
- Provide alternative approaches for every DON'T
- Use headings that make sense for someone new to the tech industry (ALL with appropriate emojis)
- Include tables for easy comparison of good vs bad approaches
- Provide real tech workplace examples and scenarios
- Cover both immediate actions and long-term career considerations
- Include conversation starters and response templates appropriate for junior professionals

## TECH INDUSTRY FOCUS AREAS:

- **Workplace Culture**: Open offices, casual dress codes, flexible hours, remote work
- **Communication**: Slack, code reviews, standups, technical discussions
- **Learning**: Continuous learning expectations, keeping up with technology trends
- **Career Growth**: Promotion paths, skill development, mentorship opportunities
- **Work-Life Balance**: Managing deadlines, on-call rotations, project pressures
- **Team Dynamics**: Working with senior developers, product managers, designers
- **Technical Environment**: Agile methodologies, version control, deployment processes

## TEMPLATE REQUIREMENTS:

- Make templates realistic and specific to tech environments
- Include both verbal and written communication examples (emails, Slack messages, etc.)
- Provide templates for different scenarios (formal meetings, casual conversations, written requests)
- Include timing guidance (when to send, best time to have conversations)
- Make templates adaptable for different company sizes and cultures

## TONE AND STYLE:

- Encouraging and supportive for someone starting their career
- Practical and realistic about tech industry expectations
- Relatable to recent graduates and career changers
- Solution-oriented with immediate actionable steps
- Clear explanations of tech industry norms and expectations
- Confidence-building while being honest about challenges

Remember: Always frame your advice specifically for someone who is NEW to the tech industry. Provide ready-to-use templates, clear DO's and DON'Ts with explanations, and alternative approaches. Consider their limited work experience, potential imposter syndrome, eagerness to learn, and need for practical guidance. Focus on actionable advice that a tech fresher can implement immediately to succeed in their role and build their career. ALWAYS add appropriate emojis to ALL headings and sub-headings.
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
      .select('hr_question')
      .single();

    if (counterError) {
      console.error('Error fetching counter:', counterError);
      return NextResponse.json(
        { error: 'Failed to fetch question counter' },
        { status: 500 }
      );
    }

    const currentCount = counterData.hr_question || 0;
    const nextQuestionId = currentCount + 1;

    // Step 2: Get the next question
    let query = supabase
      .from('hrquestionsrepo')
      .select('*');

    if (!forceRegenerate) {
      // Get the specific next question based on counter
      query = query.eq('id', nextQuestionId);
    } else {
      query = query.eq('id', nextQuestionId);
    }

    const { data: questionsData, error: questionError } = await query;

    if (questionError) {
      console.error('Error fetching question:', questionError);
      return NextResponse.json(
        { error: 'Database error while fetching question', details: questionError.message },
        { status: 500 }
      );
    }

    if (!questionsData || questionsData.length === 0) {
      console.log(`No question found with ID ${nextQuestionId}. Current counter: ${currentCount}`);
      
      // Check if there are any questions in the table at all
      const { data: allQuestions, error: countError } = await supabase
        .from('hrquestionsrepo')
        .select('id')
        .order('id', { ascending: true });
        
      if (countError) {
        return NextResponse.json(
          { error: 'Failed to check available questions' },
          { status: 500 }
        );
      }
      
      const totalQuestions = allQuestions?.length || 0;
      
      return NextResponse.json(
        { 
          error: 'No more questions available or question not found',
          details: {
            requestedQuestionId: nextQuestionId,
            currentCounter: currentCount,
            totalQuestionsInRepo: totalQuestions,
            availableQuestionIds: allQuestions?.map(q => q.id) || []
          }
        },
        { status: 404 }
      );
    }

    const question = questionsData[0] as HRQuestion;

    // Step 3: Generate comprehensive HR answer using Groq
    const prompt = createHRPrompt(question.question);
    console.log('Generating answer for HR question:', question.id);

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are an experienced career coach specializing in helping fresh graduates and entry-level professionals succeed in the tech/software industry. You understand the unique challenges of starting a tech career - from imposter syndrome to navigating workplace culture. You provide encouraging, practical guidance specifically tailored for newcomers to the tech industry. Always start with a direct answer for tech freshers, then provide detailed guidance with natural organization, tables where helpful, and real tech workplace examples. IMPORTANT: Add appropriate emojis at the start of ALL headings and sub-headings to make the content visually engaging. Focus on actionable advice that tech newcomers can implement immediately."
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

    // Step 4: Save the comprehensive response
    const { error: updateError } = await supabase
      .from('hrquestionsrepo')
      .update({ 
        response: generatedAnswer
      })
      .eq('id', question.id);

    if (updateError) {
      console.error('Error updating question with response:', updateError);
      return NextResponse.json(
        { error: 'Failed to save response' },
        { status: 500 }
      );
    }

    // Step 5: Update counter only if processing sequentially
    if (!forceRegenerate && question.id === nextQuestionId) {
      const { error: incrementError } = await supabase
        .from('questions_done')
        .update({ 
          hr_question: question.id
        })
        .eq('hr_question', currentCount);

      if (incrementError) {
        console.error('Error incrementing counter:', incrementError);
      }
    }

    return NextResponse.json({
      success: true,
      questionId: question.id,
      question: question.question,
      response: generatedAnswer,
      previousCount: currentCount,
      newCount: question.id,
      responseLength: generatedAnswer.length,
      wordCount: generatedAnswer.split(' ').length,
      estimatedReadTime: Math.ceil(generatedAnswer.split(' ').length / 200),
      message: 'Comprehensive HR response for tech freshers generated and saved successfully'
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
          const result = await processHRQuestion(id);
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
        message: `Processed ${results.filter(r => r.success).length} out of ${questionIds.length} HR questions`
      });
    }

    // Handle single question processing
    if (questionId) {
      const result = await processHRQuestion(questionId);
      return NextResponse.json(result);
    }

    // Handle processing unanswered questions
    let query = supabase
      .from('hrquestionsrepo')
      .select('id, question')
      .is('response', null)
      .limit(batchSize);

    const { data: questions, error } = await query;

    if (error || !questions || questions.length === 0) {
      return NextResponse.json(
        { error: 'No unanswered HR questions found' },
        { status: 404 }
      );
    }

    const results = [];
    for (const q of questions) {
      try {
        const result = await processHRQuestion(q.id);
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
      message: `Processed ${results.filter(r => r.success).length} unanswered HR questions`
    });

  } catch (error) {
    console.error('POST API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helper function to process individual HR questions
async function processHRQuestion(questionId: number) {
  const { data: questionData, error: questionError } = await supabase
    .from('hrquestionsrepo')
    .select('*')
    .eq('id', questionId)
    .single();

  if (questionError || !questionData) {
    throw new Error(`HR question ${questionId} not found`);
  }

  const question = questionData as HRQuestion;
  
  const prompt = createHRPrompt(question.question);

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "You are a seasoned HR professional creating comprehensive workplace guidance material. Always start with a direct answer, then provide detailed analysis with natural organization, tables where helpful, and practical workplace examples. IMPORTANT: Add appropriate emojis at the start of ALL headings and sub-headings to make the content visually engaging."
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

  // Save the response
  const { error: updateError } = await supabase
    .from('hrquestionsrepo')
    .update({ 
      response: generatedAnswer,
    })
    .eq('id', questionId);

  if (updateError) {
    throw new Error(`Failed to save response for HR question ${questionId}`);
  }

  return {
    success: true,
    questionId,
    question: question.question,
    responseLength: generatedAnswer.length,
    wordCount: generatedAnswer.split(' ').length,
    estimatedReadTime: Math.ceil(generatedAnswer.split(' ').length / 200),
    message: 'HR response for tech freshers generated successfully'
  };
}

// PUT method for updating existing responses
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

    const { questionId, regenerateResponse = false } = await request.json();
    
    if (!questionId) {
      return NextResponse.json(
        { error: 'Question ID is required' },
        { status: 400 }
      );
    }

    if (regenerateResponse) {
      const result = await processHRQuestion(questionId);
      return NextResponse.json({
        ...result,
        message: 'HR response for tech freshers regenerated successfully'
      });
    }

    return NextResponse.json(
      { error: 'Specify regenerateResponse: true to update existing response' },
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

// DELETE method for removing questions or resetting responses
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

    const { questionId, resetResponse = false, resetCounter = false } = await request.json();
    
    if (resetCounter) {
      const { error: resetError } = await supabase
        .from('questions_done')
        .update({ hr_question: 0 });
      
      if (resetError) {
        throw new Error('Failed to reset counter');
      }
      
      return NextResponse.json({
        success: true,
        message: 'HR questions counter reset to 0'
      });
    }
    
    if (resetResponse && questionId) {
      const { error: resetError } = await supabase
        .from('hrquestionsrepo')
        .update({ response: null })
        .eq('id', questionId);
      
      if (resetError) {
        throw new Error(`Failed to reset response for question ${questionId}`);
      }
      
      return NextResponse.json({
        success: true,
        questionId,
        message: 'Response reset successfully'
      });
    }

    return NextResponse.json(
      { error: 'Specify questionId with resetResponse: true, or resetCounter: true' },
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
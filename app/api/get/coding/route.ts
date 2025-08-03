import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Types
interface CodingQuestion {
  sr_no: number;
  question: string;
  approach: string;
  created_at: string;
}

interface User {
  id: string;
  coding_questions_attempted?: number;
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function GET(request: NextRequest) {
  try {
    console.log('=== CODING QUESTIONS API STARTED ===');
    console.log('Request URL:', request.url);

    // Extract user ID from cookies
    const userId = getUserIdFromCookies(request);
    console.log('User ID from cookies:', userId);

    // Get query parameters
    const requestType = request.nextUrl.searchParams.get('type');
    const questionId = request.nextUrl.searchParams.get('question_id');

    console.log('Request parameters:', { requestType, questionId, userId });

    // Route to appropriate handler
    if (requestType === 'random') {
      if (questionId) {
        return await getRandomQuestion(supabaseAdmin, parseInt(questionId), userId);
      } else {
        // Generate random question from solved questions
        return await getRandomSolvedQuestion(supabaseAdmin, userId);
      }
    } else if (requestType === 'all' && questionId) {
      return await getAllQuestionsNearId(supabaseAdmin, parseInt(questionId));
    } else {
      // For sequential questions, get next question based on user progress
      if (userId) {
        return await getNextQuestion(supabaseAdmin, userId);
      } else {
        // If no user ID, return question 1
        return await fetchQuestionById(supabaseAdmin, 1, 0);
      }
    }

  } catch (error) {
    console.error('=== API ERROR ===');
    console.error('Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        debug: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function getUserIdFromCookies(request: NextRequest): string | null {
  try {
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) {
      console.log('No cookie header found');
      return null;
    }

    // Parse cookies to find 'supabase-user-id'
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      if (key && value) {
        acc[key] = decodeURIComponent(value);
      }
      return acc;
    }, {} as Record<string, string>);

    const userId = cookies['supabase-user-id'];
    
    if (!userId || userId === 'undefined' || userId === 'null') {
      console.log('No valid user ID found in cookies');
      return null;
    }

    return userId;
  } catch (error) {
    console.error('Error parsing cookies:', error);
    return null;
  }
}

async function getNextQuestion(supabase: any, userId: string): Promise<NextResponse> {
  try {
    console.log('Getting next question for user:', userId);

    // Get user's current progress
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('coding_questions_attempted')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('User fetch error:', userError);
      // If user not found, start from question 1
      const nextQuestionId = 1;
      return await fetchQuestionById(supabase, nextQuestionId, 0);
    }

    const lastAttempted = userData?.coding_questions_attempted || 0;
    const nextQuestionId = lastAttempted + 1;

    console.log('User progress - Last attempted:', lastAttempted, 'Next question:', nextQuestionId);

    return await fetchQuestionById(supabase, nextQuestionId, lastAttempted);

  } catch (error) {
    console.error('Error in getNextQuestion:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get next question',
        debug: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function fetchQuestionById(supabase: any, questionId: number, lastAttempted: number): Promise<NextResponse> {
  try {
    // Fetch the question by ID
    const { data: questionData, error: questionError } = await supabase
      .from('codingquestionrepo')
      .select('sr_no, question, approach, created_at')
      .eq('sr_no', questionId)
      .single();

    if (questionError) {
      if (questionError.code === 'PGRST116') {
        // No more questions available
        console.log('No more questions available');
        return NextResponse.json(
          { 
            success: false,
            message: 'Congratulations! You have completed all available questions! 🎉',
            last_attempted: lastAttempted,
            total_completed: lastAttempted
          },
          { status: 404 }
        );
      }
      console.error('Question fetch error:', questionError);
      return NextResponse.json(
        { 
          error: 'Failed to fetch question',
          debug: questionError.message
        },
        { status: 500 }
      );
    }

    console.log('Successfully fetched question:', questionData.sr_no);

    return NextResponse.json({
      success: true,
      question: {
        ...questionData,
        last_attempted: lastAttempted,
        next_question_id: questionId + 1,
        progress: {
          current_question: questionId,
          questions_completed: lastAttempted
        }
      }
    });

  } catch (error) {
    console.error('Error in fetchQuestionById:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch question',
        debug: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function getRandomSolvedQuestion(supabase: any, userId: string | null): Promise<NextResponse> {
  try {
    console.log('Getting random solved question for user:', userId);

    if (!userId) {
      return NextResponse.json(
        { 
          success: false,
          message: 'Please log in to access random solved questions.',
          error: 'User not authenticated'
        },
        { status: 401 }
      );
    }

    // Get user's progress to know how many questions they've solved
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('coding_questions_attempted')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('User fetch error for random:', userError);
      return NextResponse.json(
        { 
          success: false,
          message: 'No questions solved yet. Complete some questions first!',
          error: 'User progress not found'
        },
        { status: 404 }
      );
    }

    const questionsSolved = userData?.coding_questions_attempted || 0;
    
    if (questionsSolved === 0) {
      return NextResponse.json(
        { 
          success: false,
          message: 'No questions solved yet. Complete some questions first to access random mode!',
          questions_solved: 0
        },
        { status: 404 }
      );
    }

    // Generate random question ID between 1 and questions solved
    const randomId = Math.floor(Math.random() * questionsSolved) + 1;
    console.log(`Generating random question between 1-${questionsSolved}, selected: ${randomId}`);

    return await getRandomQuestion(supabase, randomId, userId);

  } catch (error) {
    console.error('Error in getRandomSolvedQuestion:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get random solved question',
        debug: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function getRandomQuestion(supabase: any, questionId: number, userId: string | null = null): Promise<NextResponse> {
  try {
    console.log('Getting random question with ID:', questionId, 'for user:', userId);

    // If userId is provided, validate that they can access this question
    if (userId) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('coding_questions_attempted')
        .eq('id', userId)
        .single();

      if (!userError && userData) {
        const questionsSolved = userData?.coding_questions_attempted || 0;
        
        if (questionId > questionsSolved) {
          return NextResponse.json(
            { 
              success: false,
              message: `You can only access questions 1-${questionsSolved} that you've already solved.`,
              requested_id: questionId,
              max_accessible: questionsSolved
            },
            { status: 403 }
          );
        }
      }
    }

    // Fetch the specific question by ID
    const { data: questionData, error: questionError } = await supabase
      .from('codingquestionrepo')
      .select('sr_no, question, approach, created_at')
      .eq('sr_no', questionId)
      .single();

    if (questionError) {
      if (questionError.code === 'PGRST116') {
        console.log('Question not found:', questionId);
        return NextResponse.json(
          { 
            success: false,
            message: `Question #${questionId} not found.`,
            requested_id: questionId
          },
          { status: 404 }
        );
      }
      console.error('Random question fetch error:', questionError);
      return NextResponse.json(
        { 
          error: 'Failed to fetch random question',
          debug: questionError.message
        },
        { status: 500 }
      );
    }

    console.log('Successfully fetched random question:', questionData.sr_no);

    // Get user's current progress for next random suggestion
    let nextRandomSuggestion = questionId;
    if (userId) {
      const { data: userData } = await supabase
        .from('users')
        .select('coding_questions_attempted')
        .eq('id', userId)
        .single();
      
      const questionsSolved = userData?.coding_questions_attempted || 0;
      if (questionsSolved > 0) {
        nextRandomSuggestion = Math.floor(Math.random() * questionsSolved) + 1;
      }
    }

    return NextResponse.json({
      success: true,
      question: {
        ...questionData,
        last_attempted: 0, // Random questions don't track attempts
        next_question_id: nextRandomSuggestion,
        mode: 'random'
      }
    });

  } catch (error) {
    console.error('Error in getRandomQuestion:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get random question',
        debug: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function getAllQuestionsNearId(supabase: any, questionId: number): Promise<NextResponse> {
  try {
    console.log('Getting questions near ID:', questionId);

    // Return the specific question for explore mode
    const { data: questionData, error: questionError } = await supabase
      .from('codingquestionrepo')
      .select('sr_no, question, approach, created_at')
      .eq('sr_no', questionId)
      .single();

    if (questionError) {
      if (questionError.code === 'PGRST116') {
        console.log('Question not found:', questionId);
        return NextResponse.json(
          { 
            success: false,
            message: `Question #${questionId} not found. Try a different number.`,
            requested_id: questionId
          },
          { status: 404 }
        );
      }
      console.error('Explore question fetch error:', questionError);
      return NextResponse.json(
        { 
          error: 'Failed to fetch question',
          debug: questionError.message
        },
        { status: 500 }
      );
    }

    console.log('Successfully fetched explore question:', questionData.sr_no);

    return NextResponse.json({
      success: true,
      question: {
        ...questionData,
        last_attempted: 0,
        next_question_id: questionId + 1,
        mode: 'explore'
      }
    });

  } catch (error) {
    console.error('Error in getAllQuestionsNearId:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get questions near ID',
        debug: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
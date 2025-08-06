import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

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

interface QuestionListItem {
  sr_no: number;
  question: string;
  approach: string;
  created_at: string;
  is_current: boolean;
}

// Initialize Supabase clients
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);
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

    // Get authenticated user using robust authentication
    const { userId, user, authError } = await getAuthenticatedUser(request);
    console.log('Authentication result:', { userId, userEmail: user?.email, error: authError?.message });

    // Get query parameters
    const requestType = request.nextUrl.searchParams.get('type');
    const questionId = request.nextUrl.searchParams.get('question_id');
    console.log('Request parameters:', { requestType, questionId, userId });

    // Route to appropriate handler
    if (requestType === 'random') {
      if (questionId) {
        return await getRandomQuestion(supabaseAdmin, parseInt(questionId));
      } else {
        // Generate random question from all available questions
        return await getRandomQuestionFromAll(supabaseAdmin);
      }
    } else if (requestType === 'all') {
      // If questionId is provided, use it as center; otherwise start from question 1
      let centerQuestionId: number;
      if (questionId) {
        centerQuestionId = parseInt(questionId);
      } else {
        centerQuestionId = 1;
      }
      return await getTenQuestionsFromId(supabaseAdmin, centerQuestionId);
    } else {
      // For sequential questions, start from question 1 or specified ID
      const startId = questionId ? parseInt(questionId) : 1;
      return await fetchQuestionById(supabaseAdmin, startId);
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

async function getAuthenticatedUser(request: NextRequest): Promise<{
  userId: string | null;
  user: any | null;
  authError: any | null;
}> {
  let user = null;
  let authError = null;
  let userId: string | null = null;

  try {
    // Method 1: Try authorization header first
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      console.log('Using Bearer token');
      const result = await supabase.auth.getUser(token);
      user = result.data.user;
      authError = result.error;
      userId = user?.id || null;
      
      if (authError) {
        console.log('Bearer token error:', authError.message);
      }
    }

    // Method 2: Try cookies if Bearer token failed
    if (!user) {
      console.log('Trying cookie-based auth');
      const cookieStore = await cookies();
      const accessToken = cookieStore.get('supabase-access-token')?.value;
      const userIdFromCookie = cookieStore.get('supabase-user-id')?.value;

      if (accessToken) {
        const result = await supabase.auth.getUser(accessToken);
        user = result.data.user;
        authError = result.error;
        userId = user?.id || (userIdFromCookie || null);
        
        if (authError) {
          console.log('Cookie token error:', authError.message);
        }
      } else if (userIdFromCookie && userIdFromCookie !== 'undefined' && userIdFromCookie !== 'null') {
        userId = userIdFromCookie;
        console.log('Using user ID from cookie (no token verification):', userId);
      }
    }

    return { userId, user, authError };
  } catch (error) {
    console.error('Error in getAuthenticatedUser:', error);
    return { userId: null, user: null, authError: error };
  }
}

async function fetchQuestionById(supabase: any, questionId: number): Promise<NextResponse> {
  try {
    // Fetch the question by ID
    const { data: questionData, error: questionError } = await supabase
      .from('codingquestionrepo')
      .select('sr_no, question, approach, created_at')
      .eq('sr_no', questionId)
      .single();

    if (questionError) {
      if (questionError.code === 'PGRST116') {
        // Question not found
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
        next_question_id: questionId + 1,
        progress: {
          current_question: questionId
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

async function getRandomQuestionFromAll(supabase: any): Promise<NextResponse> {
  try {
    console.log('Getting random question from all available questions');

    // First, get the total count of questions to generate a random ID
    const { count: totalQuestions, error: countError } = await supabase
      .from('codingquestionrepo')
      .select('sr_no', { count: 'exact', head: true });

    if (countError || !totalQuestions) {
      console.error('Error getting question count:', countError);
      return NextResponse.json(
        { 
          error: 'Failed to get question count',
          debug: countError?.message || 'No questions found'
        },
        { status: 500 }
      );
    }

    // Generate random question ID between 1 and total questions
    const randomId = Math.floor(Math.random() * totalQuestions) + 1;
    console.log(`Generating random question between 1-${totalQuestions}, selected: ${randomId}`);

    return await getRandomQuestion(supabase, randomId);
  } catch (error) {
    console.error('Error in getRandomQuestionFromAll:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get random question',
        debug: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function getRandomQuestion(supabase: any, questionId: number): Promise<NextResponse> {
  try {
    console.log('Getting random question with ID:', questionId);

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

    // Get total questions for next random suggestion
    const { count: totalQuestions } = await supabase
      .from('codingquestionrepo')
      .select('sr_no', { count: 'exact', head: true });

    let nextRandomSuggestion = questionId;
    if (totalQuestions && totalQuestions > 0) {
      nextRandomSuggestion = Math.floor(Math.random() * totalQuestions) + 1;
    }

    return NextResponse.json({
      success: true,
      question: {
        ...questionData,
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

async function getTenQuestionsFromId(supabase: any, startId: number): Promise<NextResponse> {
  try {
    console.log('Getting 10 questions starting from ID:', startId);

    // Calculate the range: 10 consecutive questions starting from startId
    const endId = startId + 9;

    console.log('Fetching questions from ID:', startId, 'to ID:', endId);

    // Fetch 10 questions starting from the specified ID
    const { data: questionsData, error: questionsError } = await supabase
      .from('codingquestionrepo')
      .select('sr_no, question, approach, created_at')
      .gte('sr_no', startId)
      .lte('sr_no', endId)
      .order('sr_no', { ascending: true })
      .limit(10);

    if (questionsError) {
      console.error('Questions fetch error:', questionsError);
      return NextResponse.json(
        { 
          error: 'Failed to fetch questions',
          debug: questionsError.message
        },
        { status: 500 }
      );
    }

    if (!questionsData || questionsData.length === 0) {
      console.log('No questions found starting from ID:', startId);
      return NextResponse.json(
        { 
          success: false,
          message: `No questions found starting from question #${startId}`,
          requested_start_id: startId
        },
        { status: 404 }
      );
    }

    // Map questions with current question indicator
    const questionsWithMeta: QuestionListItem[] = questionsData.map((question: CodingQuestion) => ({
      ...question,
      is_current: question.sr_no === startId
    }));

    console.log('Successfully fetched', questionsData.length, 'questions starting from ID:', startId);

    // Get the total count of questions for pagination info
    const { count: totalQuestions } = await supabase
      .from('codingquestionrepo')
      .select('sr_no', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      questions: questionsWithMeta,
      meta: {
        start_question_id: startId,
        total_questions: totalQuestions || 0,
        questions_fetched: questionsData.length,
        range: {
          requested_start: startId,
          requested_end: endId,
          actual_start: questionsData[0]?.sr_no || startId,
          actual_end: questionsData[questionsData.length - 1]?.sr_no || endId
        },
        pagination: {
          has_previous: startId > 1,
          has_next: questionsData.length === 10 && (questionsData[questionsData.length - 1]?.sr_no || 0) < (totalQuestions || 0),
          previous_start: Math.max(1, startId - 10),
          next_start: startId + 10
        }
      }
    });
  } catch (error) {
    console.error('Error in getTenQuestionsFromId:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get questions',
        debug: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// Types
interface AptitudeTopic {
  id: number;
  topic_name: string;
  description?: string;
}

interface User {
  id: string;
  aptitude_questions_attempted?: number;
}

interface TopicListItem {
  id: number;
  topic_name: string;
  description?: string;
  is_current: boolean;
  questions_range: {
    start: number;
    end: number;
  };
  progress?: {
    attempted: number;
    total: number;
    percentage: number;
  };
}

interface CurrentTopicResponse {
  success: boolean;
  current_topic: {
    id: number;
    topic_name: string;
    description?: string;
    questions_attempted: number;
    current_question_in_topic: number;
    total_questions_in_topic: number;
    overall_progress: {
      total_attempted: number;
      current_topic_number: number;
    };
  };
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

const QUESTIONS_PER_TOPIC = 50;

export async function GET(request: NextRequest) {
  try {
    console.log('=== APTITUDE QUESTIONS API STARTED ===');
    console.log('Request URL:', request.url);

    // Get authenticated user using robust authentication
    const { userId, user, authError } = await getAuthenticatedUser(request);
    console.log('Authentication result:', { userId, userEmail: user?.email, error: authError?.message });

    // Get query parameters
    const requestType = request.nextUrl.searchParams.get('type');
    const topicId = request.nextUrl.searchParams.get('topic_id');
    console.log('Request parameters:', { requestType, topicId, userId });

    // Route to appropriate handler
    if (requestType === 'current') {
      // Get current topic based on user progress
      return await getCurrentTopic(supabaseAdmin, userId);
    } else if (requestType === 'all') {
      // Get list of all topics with progress information
      return await getAllTopics(supabaseAdmin, userId);
    } else if (requestType === 'topic' && topicId) {
      // Get specific topic information
      return await getTopicById(supabaseAdmin, parseInt(topicId), userId);
    } else {
      // Default: return current topic
      return await getCurrentTopic(supabaseAdmin, userId);
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

async function getUserProgress(supabase: any, userId: string | null): Promise<number> {
  if (!userId) {
    console.log('No user ID provided, returning 0 progress');
    return 0;
  }

  try {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('aptitude_questions_attempted')
      .eq('id', userId)
      .single();

    if (userError) {
      console.log('User data fetch error:', userError.message);
      return 0;
    }

    const attempted = userData?.aptitude_questions_attempted || 0;
    console.log('User progress:', attempted, 'questions attempted');
    return attempted;
  } catch (error) {
    console.error('Error getting user progress:', error);
    return 0;
  }
}

async function getCurrentTopic(supabase: any, userId: string | null): Promise<NextResponse> {
  try {
    console.log('Getting current topic for user:', userId);

    // Get user's progress
    const questionsAttempted = await getUserProgress(supabase, userId);
    
    // Calculate current topic (topics are 1-indexed)
    const currentTopicNumber = Math.floor(questionsAttempted / QUESTIONS_PER_TOPIC) + 1;
    const currentQuestionInTopic = (questionsAttempted % QUESTIONS_PER_TOPIC) + 1;

    console.log('Progress calculation:', {
      questionsAttempted,
      currentTopicNumber,
      currentQuestionInTopic
    });

    // Fetch the current topic from database
    const { data: topicData, error: topicError } = await supabase
      .from('aptitudequestionrepo')
      .select('id, topic_name, description')
      .eq('id', currentTopicNumber)
      .single();

    if (topicError) {
      if (topicError.code === 'PGRST116') {
        // Topic not found - user might have completed all topics
        console.log('Current topic not found:', currentTopicNumber);
        return NextResponse.json(
          { 
            success: false,
            message: `No more topics available. You have completed ${questionsAttempted} questions.`,
            completed: true,
            total_attempted: questionsAttempted
          },
          { status: 404 }
        );
      }
      console.error('Topic fetch error:', topicError);
      return NextResponse.json(
        { 
          error: 'Failed to fetch current topic',
          debug: topicError.message
        },
        { status: 500 }
      );
    }

    const response: CurrentTopicResponse = {
      success: true,
      current_topic: {
        id: topicData.id,
        topic_name: topicData.topic_name,
        description: topicData.description,
        questions_attempted: questionsAttempted,
        current_question_in_topic: currentQuestionInTopic,
        total_questions_in_topic: QUESTIONS_PER_TOPIC,
        overall_progress: {
          total_attempted: questionsAttempted,
          current_topic_number: currentTopicNumber
        }
      }
    };

    console.log('Successfully fetched current topic:', topicData.topic_name);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in getCurrentTopic:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get current topic',
        debug: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function getAllTopics(supabase: any, userId: string | null): Promise<NextResponse> {
  try {
    console.log('Getting all topics for user:', userId);

    // Get user's progress
    const questionsAttempted = await getUserProgress(supabase, userId);
    const currentTopicNumber = Math.floor(questionsAttempted / QUESTIONS_PER_TOPIC) + 1;

    // Fetch all topics from database
    const { data: topicsData, error: topicsError } = await supabase
      .from('aptitudequestionrepo')
      .select('id, topic_name, description')
      .order('id', { ascending: true });

    if (topicsError) {
      console.error('Topics fetch error:', topicsError);
      return NextResponse.json(
        { 
          error: 'Failed to fetch topics',
          debug: topicsError.message
        },
        { status: 500 }
      );
    }

    if (!topicsData || topicsData.length === 0) {
      console.log('No topics found');
      return NextResponse.json(
        { 
          success: false,
          message: 'No topics found in the database'
        },
        { status: 404 }
      );
    }

    // Map topics with progress and current indicator
    const topicsWithMeta: TopicListItem[] = topicsData.map((topic: AptitudeTopic) => {
      const topicStartQuestion = (topic.id - 1) * QUESTIONS_PER_TOPIC + 1;
      const topicEndQuestion = topic.id * QUESTIONS_PER_TOPIC;
      
      // Calculate progress for this topic
      let topicQuestionsAttempted = 0;
      if (questionsAttempted >= topicStartQuestion) {
        if (questionsAttempted >= topicEndQuestion) {
          topicQuestionsAttempted = QUESTIONS_PER_TOPIC; // Completed
        } else {
          topicQuestionsAttempted = questionsAttempted - topicStartQuestion + 1;
        }
      }

      return {
        id: topic.id,
        topic_name: topic.topic_name,
        description: topic.description,
        is_current: topic.id === currentTopicNumber,
        questions_range: {
          start: topicStartQuestion,
          end: topicEndQuestion
        },
        progress: {
          attempted: topicQuestionsAttempted,
          total: QUESTIONS_PER_TOPIC,
          percentage: Math.round((topicQuestionsAttempted / QUESTIONS_PER_TOPIC) * 100)
        }
      };
    });

    console.log('Successfully fetched', topicsData.length, 'topics');

    return NextResponse.json({
      success: true,
      topics: topicsWithMeta,
      meta: {
        total_topics: topicsData.length,
        current_topic_id: currentTopicNumber,
        overall_progress: {
          total_attempted: questionsAttempted,
          questions_per_topic: QUESTIONS_PER_TOPIC,
          current_topic_progress: questionsAttempted % QUESTIONS_PER_TOPIC
        }
      }
    });
  } catch (error) {
    console.error('Error in getAllTopics:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get topics',
        debug: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

async function getTopicById(supabase: any, topicId: number, userId: string | null): Promise<NextResponse> {
  try {
    console.log('Getting topic by ID:', topicId, 'for user:', userId);

    // Get user's progress
    const questionsAttempted = await getUserProgress(supabase, userId);
    const currentTopicNumber = Math.floor(questionsAttempted / QUESTIONS_PER_TOPIC) + 1;

    // Fetch the specific topic
    const { data: topicData, error: topicError } = await supabase
      .from('aptitudequestionrepo')
      .select('id, topic_name, description')
      .eq('id', topicId)
      .single();

    if (topicError) {
      if (topicError.code === 'PGRST116') {
        console.log('Topic not found:', topicId);
        return NextResponse.json(
          { 
            success: false,
            message: `Topic #${topicId} not found.`,
            requested_id: topicId
          },
          { status: 404 }
        );
      }
      console.error('Topic fetch error:', topicError);
      return NextResponse.json(
        { 
          error: 'Failed to fetch topic',
          debug: topicError.message
        },
        { status: 500 }
      );
    }

    // Calculate progress for this specific topic
    const topicStartQuestion = (topicId - 1) * QUESTIONS_PER_TOPIC + 1;
    const topicEndQuestion = topicId * QUESTIONS_PER_TOPIC;
    
    let topicQuestionsAttempted = 0;
    if (questionsAttempted >= topicStartQuestion) {
      if (questionsAttempted >= topicEndQuestion) {
        topicQuestionsAttempted = QUESTIONS_PER_TOPIC; // Completed
      } else {
        topicQuestionsAttempted = questionsAttempted - topicStartQuestion + 1;
      }
    }

    const topicWithMeta: TopicListItem = {
      id: topicData.id,
      topic_name: topicData.topic_name,
      description: topicData.description,
      is_current: topicData.id === currentTopicNumber,
      questions_range: {
        start: topicStartQuestion,
        end: topicEndQuestion
      },
      progress: {
        attempted: topicQuestionsAttempted,
        total: QUESTIONS_PER_TOPIC,
        percentage: Math.round((topicQuestionsAttempted / QUESTIONS_PER_TOPIC) * 100)
      }
    };

    console.log('Successfully fetched topic:', topicData.topic_name);

    return NextResponse.json({
      success: true,
      topic: topicWithMeta,
      meta: {
        overall_progress: {
          total_attempted: questionsAttempted,
          current_topic_number: currentTopicNumber
        }
      }
    });
  } catch (error) {
    console.error('Error in getTopicById:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get topic',
        debug: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
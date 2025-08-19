"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

interface Question {
  sr_no: number;
  question: string;
  approach: string;
  created_at: string;
  last_attempted?: number;
  next_question_id?: number;
  progress?: {
    current_question: number;
    questions_completed: number;
  };
}

interface ApiResponse {
  success: boolean;
  question?: Question;
  message?: string;
  error?: string;
}

interface UserProfile {
  id: string;
  email: string;
  coding_questions_attempted: number;
  current_streak: [string, number]; // ["2025-08-03", 3]
  total_points: number;
  progress: {
    current_streak: [string, number];
    total_points: number;
  };
}

// Helper function to read cookies
const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null
  
  const cookies = document.cookie.split(';')
  const cookie = cookies.find(cookie => cookie.trim().startsWith(`${name}=`))
  return cookie ? decodeURIComponent(cookie.split('=')[1]) : null
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
}

const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

export default function NineLives() {
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [catAnimation, setCatAnimation] = useState('😺');
  const [userCodingProgress, setUserCodingProgress] = useState<number>(-1); // Initialize as -1 to indicate loading
  const router = useRouter();

  // Cat animation cycle
  useEffect(() => {
    const cats = ['😺', '😸', '😻', '🐱', '😽'];
    let index = 0;
    
    const interval = setInterval(() => {
      index = (index + 1) % cats.length;
      setCatAnimation(cats[index]);
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  // Fetch profile and coding progress on component mount
  useEffect(() => {
    const initializeData = async () => {
      await fetchUserCodingProgress();
      await fetchProfile();
    };
    initializeData();
  }, []);

  // Fetch next question when coding progress is loaded (and not -1)
  useEffect(() => {
    if (userCodingProgress >= 0) {
      fetchNextQuestion();
    }
  }, [userCodingProgress]);

  const fetchUserCodingProgress = async () => {
    try {
      // Check if Supabase is properly initialized
      if (!supabase) {
        console.error('Database connection not available')
        setUserCodingProgress(0);
        return
      }

      // Get user ID from client-accessible cookie or localStorage
      let userId = getCookie('client-user-id') || localStorage.getItem('client-user-id') || localStorage.getItem('supabase-user-id')
      
      if (!userId) {
        console.error('User not authenticated')
        setUserCodingProgress(0);
        return
      }

      console.log('Fetching coding progress for user ID:', userId)

      // Fetch user's coding_questions_attempted directly from Supabase
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('coding_questions_attempted')
        .eq('id', userId)
        .single()

      if (userError || !userData) {
        console.error('Failed to fetch user coding progress:', userError)
        setUserCodingProgress(0);
        return
      }

      const progress = userData.coding_questions_attempted || 0;
      console.log('User coding progress loaded:', progress)
      setUserCodingProgress(progress);

    } catch (err) {
      console.error('Error fetching coding progress:', err)
      setUserCodingProgress(0);
    }
  };

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.profile) {
          setProfile(data.profile);
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const fetchNextQuestion = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Calculate the NEXT question ID (attempted + 1)
      const nextQuestionId = userCodingProgress + 1;
      
      console.log(`Fetching next question: User has attempted ${userCodingProgress} questions, so next question should be #${nextQuestionId}`);
      
      // First, try to fetch the specific next question
      const response = await fetch(`/api/get/coding?type=specific&question_id=${nextQuestionId}`);
      const data: ApiResponse = await response.json();
      
      if (data.success && data.question) {
        console.log(`Successfully fetched question #${data.question.sr_no}`);
        
        // Add progress info to the question
        const questionWithProgress = {
          ...data.question,
          progress: {
            current_question: nextQuestionId,
            questions_completed: userCodingProgress
          }
        };
        setCurrentQuestion(questionWithProgress);
      } else {
        console.log(`No specific question found for ID ${nextQuestionId}, trying fallback...`);
        
        // If no specific question found, try the regular endpoint as fallback
        const fallbackResponse = await fetch('/api/get/coding');
        const fallbackData: ApiResponse = await fallbackResponse.json();
        
        if (fallbackData.success && fallbackData.question) {
          console.log(`Fallback question fetched: #${fallbackData.question.sr_no}`);
          
          const questionWithProgress = {
            ...fallbackData.question,
            progress: {
              current_question: fallbackData.question.sr_no,
              questions_completed: userCodingProgress
            }
          };
          setCurrentQuestion(questionWithProgress);
        } else {
          // If we've completed all questions, show completion message
          if (userCodingProgress >= 200) {
            setError('🎉 Congratulations! You\'ve completed all 200 questions! You can still review previous questions or shuffle for practice.');
          } else {
            setError(data.message || data.error || `Question #${nextQuestionId} not found. You may have reached the end of available questions.`);
          }
        }
      }
    } catch (err) {
      setError('Network error occurred while fetching next question');
      console.error('Error fetching question:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRandomQuestion = async () => {
    try {
      setIsShuffling(true);
      setError(null);
      
      const response = await fetch('/api/get/coding?type=random');
      const data: ApiResponse = await response.json();
      
      if (data.success && data.question) {
        // Add progress info to the random question
        const questionWithProgress = {
          ...data.question,
          progress: {
            current_question: data.question.sr_no,
            questions_completed: userCodingProgress
          }
        };
        setCurrentQuestion(questionWithProgress);
      } else {
        setError(data.message || data.error || 'No questions available for shuffle');
      }
    } catch (err) {
      setError('Failed to shuffle question');
      console.error('Error shuffling question:', err);
    } finally {
      setIsShuffling(false);
    }
  };

  const handleQuestionClick = () => {
    if (currentQuestion) {
      router.push(`/coding/${currentQuestion.sr_no}`);
    }
  };

  const handleViewList = () => {
    router.push('/coding/list');
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include'
      });
      
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      router.push('/login');
    }
  };

  // Helper function to get streak display info
  const getStreakDisplay = () => {
    if (!profile?.progress?.current_streak) {
      return { text: 'Streak', emoji: '🔥', streakNumber: 0, isGrayscale: true };
    }

    const [streakDate, streakDays] = profile.progress.current_streak;
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (streakDate === today) {
      return { text: 'Streak', emoji: '🔥', streakNumber: streakDays, isGrayscale: false };
    } else if (streakDate === yesterday) {
      return { text: 'Streak', emoji: '🔥', streakNumber: streakDays, isGrayscale: true };
    } else {
      return { text: 'Streak', emoji: '🔥', streakNumber: 0, isGrayscale: true };
    }
  };

  const getQuestionStatusInfo = () => {
    if (!currentQuestion) return { status: '', color: 'text-gray-600', icon: '🎯' };
    
    const nextQuestionId = userCodingProgress + 1;
    
    if (currentQuestion.sr_no < nextQuestionId) {
      return { 
        status: 'COMPLETED - Review Mode', 
        color: 'text-green-600', 
        icon: '✅' 
      };
    } else if (currentQuestion.sr_no === nextQuestionId) {
      return { 
        status: 'NEXT CHALLENGE - Ready to Pounce!', 
        color: 'text-blue-600', 
        icon: '🎯' 
      };
    } else {
      return { 
        status: 'FUTURE QUESTION - Available for Practice', 
        color: 'text-orange-600', 
        icon: '🔮' 
      };
    }
  };

  // Show loading state while fetching user progress
  if (loading || userCodingProgress === -1) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6 animate-pulse">🐱</div>
          <p className="font-mono text-gray-600">Loading your next adventure...</p>
          <div className="mt-6 w-32 h-0.5 bg-gray-100 mx-auto overflow-hidden">
            <div className="h-full bg-black animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  const streakDisplay = getStreakDisplay();
  const statusInfo = getQuestionStatusInfo();

  return (
    <div className="min-h-screen bg-white text-black font-mono">
      {/* Header */}
      <header className="border-b border-gray-100 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-pulse">🐾</span>
            <h1 className="text-2xl font-light"><a href='/home'>9lives</a></h1>
          </div>
          
          <div className="flex items-center gap-8">
            {profile && (
              <>
                <div className="text-center">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">
                    {streakDisplay.text}
                  </p>
                  <p className={`text-lg font-light ${streakDisplay.isGrayscale ? 'grayscale opacity-50' : ''}`}>
                    {streakDisplay.streakNumber} <span>{streakDisplay.emoji}</span>
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Fish</p>
                  <p className="text-lg font-light">{profile.progress.total_points} 🐟</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Progress</p>
                  <p className="text-lg font-light">{userCodingProgress}/200 💻</p>
                </div>
                <button 
                  onClick={() => router.push('/leaderboard')}
                  className="text-center hover:scale-105 transition-transform duration-300 cursor-pointer"
                >
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Leaderboard</p>
                  <p className="text-lg font-light">📈</p>
                </button>
                <div className="text-center hidden md:block">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Welcome</p>
                  <p className="text-sm font-light">{profile.email}</p>
                </div>
              </>
            )}
            <button 
              onClick={handleLogout}
              className="py-2 px-4 border border-gray-200 hover:border-black hover:bg-gray-50 transition-all duration-300 font-light text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto">
        {/* Progress Section */}
        <div className="flex justify-between items-center py-6 px-6">
          <div className="flex items-center gap-4">
            <div className="text-2xl transition-all duration-500">{catAnimation}</div>
            <div>
              <h2 className="text-xl font-light">Your Next Challenge</h2>
              <p className="text-sm text-gray-600 font-light">
                {userCodingProgress > 0 
                  ? `${userCodingProgress} questions conquered • Next up: Question #${userCodingProgress + 1}` 
                  : 'Ready to begin your coding journey with Question #1'}
              </p>
            </div>
          </div>
          
          <div className="text-xs bg-gray-50 px-3 py-1 border border-gray-200 font-light">
            Target: Question #{userCodingProgress + 1} • {userCodingProgress} completed
          </div>
        </div>

        <div className="px-6">
          {error ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">😿</div>
              <div className="text-lg mb-6 text-red-400 font-light">{error}</div>
              <div className="space-y-4">
                <button
                  onClick={fetchNextQuestion}
                  className="py-3 px-6 bg-black text-white font-light hover:bg-gray-800 transition-all duration-300 mr-4"
                >
                  Try Again
                </button>
                <button
                  onClick={handleViewList}
                  className="py-3 px-6 border border-gray-200 font-light hover:border-black hover:bg-gray-50 transition-all duration-300"
                >
                  View All Questions
                </button>
              </div>
            </div>
          ) : currentQuestion ? (
            <>
              {/* Question Status Banner */}
              <div className={`mb-6 p-4 border-l-4 ${
                statusInfo.color.includes('green') 
                  ? 'border-green-500 bg-green-50' 
                  : statusInfo.color.includes('blue')
                  ? 'border-blue-500 bg-blue-50'
                  : statusInfo.color.includes('orange')
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-500 bg-gray-50'
              }`}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">{statusInfo.icon}</span>
                  <div>
                    <p className={`font-medium text-sm ${statusInfo.color}`}>
                      {statusInfo.status}
                    </p>
                    <p className="text-xs text-gray-600 font-light mt-1">
                      {currentQuestion.sr_no < userCodingProgress + 1
                        ? "You've already solved this! Click to review your solution or practice again."
                        : currentQuestion.sr_no === userCodingProgress + 1
                        ? "This is your next challenge! Time to level up your skills."
                        : "This is a future question available for practice!"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Question Card */}
              <div 
                onClick={handleQuestionClick}
                className="bg-white border border-gray-100 hover:border-black cursor-pointer transition-all duration-300 hover:shadow-sm group mb-6"
              >
                <div className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-3 py-1 font-light uppercase tracking-wider ${
                        currentQuestion.sr_no < userCodingProgress + 1
                          ? 'bg-green-600 text-white'
                          : currentQuestion.sr_no === userCodingProgress + 1
                          ? 'bg-blue-600 text-white'
                          : 'bg-orange-600 text-white'
                      }`}>
                        QUESTION #{currentQuestion.sr_no}
                      </span>
                      {currentQuestion.sr_no === userCodingProgress + 1 && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 font-light border border-blue-200">
                          NEXT UP! 🎯
                        </span>
                      )}
                      {currentQuestion.sr_no < userCodingProgress + 1 && (
                        <span className="text-xs bg-green-100 text-green-600 px-2 py-1 font-light border border-green-200">
                          COMPLETED ✅
                        </span>
                      )}
                      {currentQuestion.sr_no > userCodingProgress + 1 && (
                        <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 font-light border border-orange-200">
                          FUTURE 🔮
                        </span>
                      )}
                    </div>
                    <span className="text-xl group-hover:animate-bounce">{statusInfo.icon}</span>
                  </div>
                  
                  <h3 className="text-xl font-light mb-4 leading-relaxed">
                    {currentQuestion.question}
                  </h3>
                  
                  <div className="text-gray-600 mb-4">
                    <span className="font-light text-sm uppercase tracking-wider text-gray-400">Approach Hint:</span>
                    <p className="mt-2 bg-gray-50 p-4 border-l-2 border-black font-light text-sm">
                      {currentQuestion.approach}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-400 font-light">
                    <span>
                      {currentQuestion.sr_no < userCodingProgress + 1
                        ? "Click to review and practice →"
                        : currentQuestion.sr_no === userCodingProgress + 1
                        ? "Click to start solving →"
                        : "Click to practice ahead →"}
                    </span>
                    <span>Added: {new Date(currentQuestion.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid md:grid-cols-3 gap-4 mb-8">
                {/* Shuffle Button */}
                <button
                  onClick={fetchRandomQuestion}
                  disabled={isShuffling}
                  className="flex items-center justify-center gap-3 p-4 bg-white border border-gray-100 hover:border-black hover:bg-gray-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <span className="text-xl group-hover:animate-spin">🎲</span>
                  <div className="text-left">
                    <div className="font-light text-sm uppercase tracking-wider">SHUFFLE</div>
                    <div className="text-xs text-gray-400 font-light">
                      {isShuffling ? 'Shuffling...' : 'Random question'}
                    </div>
                  </div>
                </button>

                {/* Next Question Button */}
                <button
                  onClick={fetchNextQuestion}
                  className="flex items-center justify-center gap-3 p-4 bg-black text-white border border-black hover:bg-gray-800 transition-all duration-300 group"
                >
                  <span className="text-xl">⏭️</span>
                  <div className="text-left">
                    <div className="font-light text-sm uppercase tracking-wider">NEXT CHALLENGE</div>
                    <div className="text-xs opacity-70 font-light">Question #{userCodingProgress + 1}</div>
                  </div>
                </button>

                {/* View List Button */}
                <button
                  onClick={handleViewList}
                  className="flex items-center justify-center gap-3 p-4 bg-white border border-gray-100 hover:border-black hover:bg-gray-50 transition-all duration-300 group"
                >
                  <span className="text-xl">📋</span>
                  <div className="text-left">
                    <div className="font-light text-sm uppercase tracking-wider">VIEW LIST</div>
                    <div className="text-xs text-gray-400 font-light">All questions</div>
                  </div>
                </button>
              </div>

              {/* Progress Summary */}
              <div className="bg-gray-50 border border-gray-200 p-6 mb-8">
                <div className="text-center">
                  <h3 className="text-lg font-light mb-4">Your Coding Journey</h3>
                  <div className="grid grid-cols-3 gap-6 text-center max-w-md mx-auto">
                    <div>
                      <div className="text-2xl font-light mb-1 text-green-600">{userCodingProgress}</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider">Completed</div>
                    </div>
                    <div>
                      <div className="text-2xl font-light mb-1 text-blue-600">{userCodingProgress + 1}</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider">Next Target</div>
                    </div>
                    <div>
                      <div className="text-2xl font-light mb-1 text-gray-600">200</div>
                      <div className="text-xs text-gray-500 uppercase tracking-wider">Total</div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-200 h-2 mt-4 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-blue-500 h-full transition-all duration-700 ease-out"
                      style={{ width: `${Math.min((userCodingProgress / 200) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 font-light mt-2">
                    {Math.round((userCodingProgress / 200) * 100)}% Complete
                  </p>
                </div>
              </div>

              {/* Cat wisdom footer */}
              <div className="text-center py-6 border-t border-gray-100">
                <div className="text-2xl mb-2">🐾</div>
                <p className="text-sm text-gray-400 font-light italic">
                  "A cat has nine lives. A programmer has unlimited compilation attempts."
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">😺</div>
              <div className="text-lg font-light">No questions available</div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
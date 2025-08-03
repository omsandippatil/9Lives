"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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
  email: string;
  current_streak: number;
  total_points: number;
  progress: {
    current_streak: number;
    total_points: number;
  };
}

export default function NineLives() {
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [catAnimation, setCatAnimation] = useState('😺');
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

  // Fetch profile and question on component mount
  useEffect(() => {
    fetchProfile();
    fetchNextQuestion();
  }, []);

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
      
      const response = await fetch('/api/get/coding');
      const data: ApiResponse = await response.json();
      
      if (data.success && data.question) {
        setCurrentQuestion(data.question);
      } else {
        setError(data.message || data.error || 'Failed to fetch question');
      }
    } catch (err) {
      setError('Network error occurred');
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
        setCurrentQuestion(data.question);
      } else {
        setError(data.message || data.error || 'No solved questions available for shuffle');
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

  if (loading) {
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

  return (
    <div className="min-h-screen bg-white text-black font-mono">
      {/* Header - Same as HomePage */}
      <header className="border-b border-gray-100 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-pulse">🐾</span>
            <h1 className="text-2xl font-light">9lives</h1>
          </div>
          
          <div className="flex items-center gap-8">
            {profile && (
              <>
                <div className="text-center">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Streak</p>
                  <p className="text-lg font-light">{profile.progress.current_streak} 🔥</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Points</p>
                  <p className="text-lg font-light">{profile.progress.total_points} ⭐</p>
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
        <div className="flex justify-end py-6 px-6">
          {currentQuestion?.progress && (
            <div className="text-xs bg-gray-50 px-3 py-1 border border-gray-200 font-light">
              Progress: {currentQuestion.progress.questions_completed} questions mastered
            </div>
          )}
        </div>

        <div className="px-6">
          {error ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">😿</div>
              <div className="text-lg mb-6 text-red-400 font-light">{error}</div>
              <button
                onClick={fetchNextQuestion}
                className="py-3 px-6 bg-black text-white font-light hover:bg-gray-800 transition-all duration-300"
              >
                Try Again
              </button>
            </div>
          ) : currentQuestion ? (
            <>
              {/* Question Card */}
              <div 
                onClick={handleQuestionClick}
                className="bg-white border border-gray-100 hover:border-black cursor-pointer transition-all duration-300 hover:shadow-sm group mb-6"
              >
                <div className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-xs bg-black text-white px-3 py-1 font-light uppercase tracking-wider">
                      QUESTION #{currentQuestion.sr_no}
                    </span>
                    <span className="text-xl group-hover:animate-bounce">🎯</span>
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
                    <span>Click to start solving →</span>
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
                      {isShuffling ? 'Shuffling...' : 'Random solved question'}
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
                    <div className="font-light text-sm uppercase tracking-wider">NEXT LIFE</div>
                    <div className="text-xs opacity-70 font-light">Continue journey</div>
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
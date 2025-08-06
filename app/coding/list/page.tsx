"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Question {
  sr_no: number;
  question: string;
  approach: string;
  created_at: string;
  is_current: boolean;
}

interface ApiResponse {
  success: boolean;
  questions?: Question[];
  meta?: {
    start_question_id: number;
    total_questions: number;
    questions_fetched: number;
    range: {
      requested_start: number;
      requested_end: number;
      actual_start: number;
      actual_end: number;
    };
    pagination: {
      has_previous: boolean;
      has_next: boolean;
      previous_start: number;
      next_start: number;
    };
  };
  message?: string;
  error?: string;
}

interface UserProfile {
  email: string;
  current_streak: [string, number]; // ["2025-08-03", 3]
  total_points: number;
  progress: {
    current_streak: [string, number];
    total_points: number;
  };
}

export default function QuestionsList() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [meta, setMeta] = useState<ApiResponse['meta'] | null>(null);
  const [currentStartId, setCurrentStartId] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchProfile();
    fetchQuestions();
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

  const fetchQuestions = async (startId: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch 10 questions starting from the specified ID
      const response = await fetch(`/api/get/coding?type=all&question_id=${startId}`);
      const data: ApiResponse = await response.json();
      
      if (data.success && data.questions && data.meta) {
        setQuestions(data.questions);
        setMeta(data.meta);
        setCurrentStartId(startId);
      } else {
        setError(data.message || data.error || 'Failed to fetch questions');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error fetching questions:', err);
    } finally {
      setLoading(false);
    }
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

  const handleQuestionClick = (questionId: number) => {
    // All questions are now accessible
    router.push(`/coding/${questionId}`);
  };

  const handleBackToHome = () => {
    router.push('/coding');
  };

  const handlePageNavigation = (direction: 'prev' | 'next') => {
    if (!meta) return;
    
    if (direction === 'next' && meta.pagination.has_next) {
      fetchQuestions(meta.pagination.next_start);
    } else if (direction === 'prev' && meta.pagination.has_previous) {
      fetchQuestions(meta.pagination.previous_start);
    }
  };

  const handleJumpToQuestion = () => {
    const questionId = prompt('Enter question number:');
    if (questionId && !isNaN(Number(questionId))) {
      const id = Number(questionId);
      if (id >= 1 && id <= (meta?.total_questions || 0)) {
        fetchQuestions(id);
      } else {
        alert(`Please enter a number between 1 and ${meta?.total_questions || 0}`);
      }
    }
  };

  const handleFirstPage = () => {
    fetchQuestions(1);
  };

  const handleLastPage = () => {
    if (meta?.total_questions) {
      // Calculate the start of the last page
      const lastPageStart = Math.max(1, meta.total_questions - 9);
      fetchQuestions(lastPageStart);
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

  // Filter questions based on search term
  const filteredQuestions = questions.filter(question => 
    question.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    question.approach.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getQuestionIcon = (question: Question) => {
    if (question.is_current) return '😸'; // grinning cat (current question)
    return '😺'; // happy cat (all questions are accessible)
  };

  const getQuestionStatus = (question: Question) => {
    if (question.is_current) return 'Current purr-blem';
    return 'Ready to pounce';
  };

  const getQuestionStyles = (question: Question) => {
    if (question.is_current) {
      return 'border-blue-300 bg-blue-50 hover:border-blue-500 cursor-pointer';
    }
    return 'border-gray-200 hover:border-black cursor-pointer';
  };

  const getCurrentPageNumber = () => {
    if (!meta) return 1;
    return Math.ceil(meta.start_question_id / 10);
  };

  const getTotalPages = () => {
    if (!meta) return 1;
    return Math.ceil(meta.total_questions / 10);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6 animate-pulse">🐱</div>
          <p className="font-mono text-gray-600">Cat is fetching your questions...</p>
          <div className="mt-6 w-32 h-0.5 bg-gray-100 mx-auto overflow-hidden">
            <div className="h-full bg-black animate-pulse"></div>
          </div>
          <p className="text-sm text-gray-400 font-light mt-4 italic">*purring intensifies*</p>
        </div>
      </div>
    );
  }

  const streakDisplay = getStreakDisplay();

  return (
    <div className="min-h-screen bg-white text-black font-mono">
      {/* Header */}
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
      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={handleBackToHome}
              className="flex items-center gap-2 text-gray-600 hover:text-black transition-colors duration-300"
            >
              <span>←</span>
              <span className="font-light">Back to Nine Lives</span>
              <span className="text-xs text-gray-400 italic ml-1">🐾</span>
            </button>
            <div className="text-2xl">🐱</div>
            <h2 className="text-2xl font-light">Question Library</h2>
            <span className="text-xs text-gray-400 font-light italic ml-2">*meow*</span>
          </div>
          
          <div className="text-sm text-gray-600 font-light">
            {meta && (
              <>
                Questions {meta.range.actual_start}-{meta.range.actual_end} of {meta.total_questions}
                <span className="ml-2 text-blue-600">
                  (All questions are accessible! 🎉)
                </span>
              </>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          {/* Pagination Controls */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleFirstPage}
              disabled={!meta || !meta.pagination.has_previous}
              className="px-3 py-2 border font-light text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-white text-black border-gray-200 hover:border-black disabled:hover:border-gray-200"
            >
              ⏮ First
            </button>
            
            <button
              onClick={() => handlePageNavigation('prev')}
              disabled={!meta || !meta.pagination.has_previous}
              className="px-4 py-2 border font-light text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-white text-black border-gray-200 hover:border-black disabled:hover:border-gray-200"
            >
              ← Previous
            </button>
            
            <button
              onClick={handleJumpToQuestion}
              className="px-4 py-2 border border-gray-200 hover:border-black font-light text-sm transition-all duration-300"
            >
              Jump to Question...
            </button>
            
            <button
              onClick={() => handlePageNavigation('next')}
              disabled={!meta || !meta.pagination.has_next}
              className="px-4 py-2 border font-light text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-white text-black border-gray-200 hover:border-black disabled:hover:border-gray-200"
            >
              Next →
            </button>
            
            <button
              onClick={handleLastPage}
              disabled={!meta || !meta.pagination.has_next}
              className="px-3 py-2 border font-light text-sm transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed bg-white text-black border-gray-200 hover:border-black disabled:hover:border-gray-200"
            >
              Last ⏭
            </button>
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search questions in current view... 🔍"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 focus:border-black focus:outline-none font-light text-sm"
            />
          </div>
        </div>

        {/* Page Info */}
        {meta && (
          <div className="mb-8 p-4 bg-gray-50 border border-gray-200">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600 font-light">
                <span className="font-medium">Cat's Library Status:</span> All {meta.total_questions} questions are now freely accessible! 🐱‍📚
              </div>
              <div className="text-sm text-gray-600 font-light">
                Page {getCurrentPageNumber()} of {getTotalPages()} 
                <span className="ml-2">🐾</span>
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500 italic">
              *The wise cat has unlocked all knowledge for you* ✨
            </div>
          </div>
        )}

        {/* Questions List */}
        {error ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">🙀</div>
            <div className="text-lg mb-6 text-red-400 font-light">Oops! The cat knocked something over... {error}</div>
            <button
              onClick={() => fetchQuestions(currentStartId)}
              className="py-3 px-6 bg-black text-white font-light hover:bg-gray-800 transition-all duration-300"
            >
              Help Cat Fix This 🐾
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredQuestions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🐱‍💻</div>
                <div className="text-lg font-light text-gray-600">
                  The cat couldn't find any questions matching your search
                </div>
                <p className="text-sm text-gray-400 font-light mt-2 italic">*confused meowing*</p>
              </div>
            ) : (
              filteredQuestions.map((question) => (
                <div
                  key={question.sr_no}
                  onClick={() => handleQuestionClick(question.sr_no)}
                  className={`bg-white border transition-all duration-300 hover:shadow-sm group ${getQuestionStyles(question)}`}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className={`text-xs px-3 py-1 font-light uppercase tracking-wider ${
                          question.is_current 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-black text-white'
                        }`}>
                          #{question.sr_no}
                        </span>
                        <span className="text-lg">{getQuestionIcon(question)}</span>
                        <span className={`text-xs font-light ${
                          question.is_current 
                            ? 'text-blue-600'
                            : 'text-gray-600'
                        }`}>
                          {getQuestionStatus(question)}
                        </span>
                        {question.is_current && (
                          <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 font-light border border-blue-200">
                            CURRENT HUNT 🎯
                          </span>
                        )}
                        <span className="text-xs bg-green-100 text-green-600 px-2 py-1 font-light border border-green-200">
                          UNLOCKED 🔓
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-xl group-hover:animate-bounce">🐾</span>
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-light mb-3 leading-relaxed">
                      {question.question}
                    </h3>
                    
                    <div className="text-gray-600 mb-4">
                      <p className="text-sm bg-gray-50 p-3 border-l-2 border-gray-300 font-light line-clamp-2">
                        {question.approach}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-400 font-light">
                      <span>
                        Click to pounce on this purr-blem! →
                      </span>
                      <span>Added: {new Date(question.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Pagination Footer */}
        {meta && (
          <div className="flex flex-col sm:flex-row justify-between items-center mt-8 pt-8 border-t border-gray-100 gap-4">
            <div className="text-sm text-gray-600 font-light text-center sm:text-left">
              Showing questions {meta.range.actual_start} - {meta.range.actual_end} of {meta.total_questions}
              <span className="italic text-gray-400 ml-2">*all questions unlocked* 😸</span>
            </div>
            
            <div className="flex gap-2 flex-wrap justify-center">
              <button
                onClick={handleFirstPage}
                disabled={!meta.pagination.has_previous}
                className="px-3 py-1 text-sm border border-gray-200 hover:border-black font-light transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200"
              >
                ⏮ First
              </button>
              
              <button
                onClick={() => handlePageNavigation('prev')}
                disabled={!meta.pagination.has_previous}
                className="px-3 py-1 text-sm border border-gray-200 hover:border-black font-light transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200"
              >
                ← Prev
              </button>
              
              <span className="px-3 py-1 text-sm text-gray-600 font-light">
                Page {getCurrentPageNumber()} of {getTotalPages()} 🐾
              </span>
              
              <button
                onClick={() => handlePageNavigation('next')}
                disabled={!meta.pagination.has_next}
                className="px-3 py-1 text-sm border border-gray-200 hover:border-black font-light transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200"
              >
                Next →
              </button>
              
              <button
                onClick={handleLastPage}
                disabled={!meta.pagination.has_next}
                className="px-3 py-1 text-sm border border-gray-200 hover:border-black font-light transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-200"
              >
                Last ⏭
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-8 border-t border-gray-100 mt-12">
          <div className="text-2xl mb-2">🐱‍📚</div>
          <p className="text-sm text-gray-400 font-light italic">
            "A cat has nine lives. For three he plays, for three he strays, and for the last three he stays." - English Proverb
          </p>
          <p className="text-xs text-gray-300 font-light mt-2">*All knowledge is now freely available to you, fellow cat!* 🐾</p>
        </div>
      </main>
    </div>
  );
}
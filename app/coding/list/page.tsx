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
  is_solved?: boolean;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  tags?: string[];
}

interface ApiResponse {
  success: boolean;
  questions?: Question[];
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

export default function QuestionsList() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [filter, setFilter] = useState<'all' | 'solved' | 'unsolved'>('all');
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

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get current question ID to fetch all questions relative to current progress
      const currentResponse = await fetch('/api/get/coding');
      const currentData = await currentResponse.json();
      const currentQuestionId = currentData.question?.sr_no || 1;
      
      // Fetch all questions with current progress context
      const response = await fetch(`/api/get/coding?type=all&question_id=${currentQuestionId}`);
      const data: ApiResponse = await response.json();
      
      if (data.success && data.questions) {
        setQuestions(data.questions);
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
    router.push(`/coding/${questionId}`);
  };

  const handleBackToHome = () => {
    router.push('/coding');
  };

  // Filter questions based on current filter and search term
  const filteredQuestions = questions.filter(question => {
    const matchesFilter = filter === 'all' || 
      (filter === 'solved' && question.is_solved) ||
      (filter === 'unsolved' && !question.is_solved);
    
    const matchesSearch = question.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      question.approach.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const getQuestionIcon = (question: Question) => {
    if (question.is_solved) return '✅';
    if (question.last_attempted) return '⏳';
    return '📝';
  };

  const getQuestionStatus = (question: Question) => {
    if (question.is_solved) return 'Solved';
    if (question.last_attempted) return 'In Progress';
    return 'Not Started';
  };

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-600 bg-green-50 border-green-200';
      case 'Medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'Hard': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6 animate-pulse">📚</div>
          <p className="font-mono text-gray-600">Loading question library...</p>
          <div className="mt-6 w-32 h-0.5 bg-gray-100 mx-auto overflow-hidden">
            <div className="h-full bg-black animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black font-mono">
      {/* Header - Same as NineLives */}
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
            </button>
            <div className="text-2xl">📚</div>
            <h2 className="text-2xl font-light">Question Library</h2>
          </div>
          
          <div className="text-sm text-gray-600 font-light">
            {filteredQuestions.length} question{filteredQuestions.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          {/* Filter Buttons */}
          <div className="flex gap-2">
            {(['all', 'solved', 'unsolved'] as const).map((filterType) => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType)}
                className={`px-4 py-2 border font-light text-sm capitalize transition-all duration-300 ${
                  filter === filterType
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-black border-gray-200 hover:border-black'
                }`}
              >
                {filterType === 'all' ? 'All Questions' : 
                 filterType === 'solved' ? 'Solved' : 'Unsolved'}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search questions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 focus:border-black focus:outline-none font-light text-sm"
            />
          </div>
        </div>

        {/* Questions List */}
        {error ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">😿</div>
            <div className="text-lg mb-6 text-red-400 font-light">{error}</div>
            <button
              onClick={fetchQuestions}
              className="py-3 px-6 bg-black text-white font-light hover:bg-gray-800 transition-all duration-300"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredQuestions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🔍</div>
                <div className="text-lg font-light text-gray-600">
                  No questions found matching your criteria
                </div>
              </div>
            ) : (
              filteredQuestions.map((question) => (
                <div
                  key={question.sr_no}
                  onClick={() => handleQuestionClick(question.sr_no)}
                  className="bg-white border border-gray-100 hover:border-black cursor-pointer transition-all duration-300 hover:shadow-sm group"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-xs bg-black text-white px-3 py-1 font-light uppercase tracking-wider">
                          #{question.sr_no}
                        </span>
                        <span className="text-lg">{getQuestionIcon(question)}</span>
                        <span className="text-xs text-gray-500 font-light">
                          {getQuestionStatus(question)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {question.difficulty && (
                          <span className={`text-xs px-2 py-1 border font-light ${getDifficultyColor(question.difficulty)}`}>
                            {question.difficulty}
                          </span>
                        )}
                        <span className="text-xl group-hover:animate-bounce">🎯</span>
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

                    {question.tags && question.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {question.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="text-xs bg-gray-100 text-gray-600 px-2 py-1 font-light"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between text-xs text-gray-400 font-light">
                      <span>Click to {question.is_solved ? 'review' : 'solve'} →</span>
                      <span>Added: {new Date(question.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-8 border-t border-gray-100 mt-12">
          <div className="text-2xl mb-2">📚</div>
          <p className="text-sm text-gray-400 font-light italic">
            "The more that you read, the more things you will know. The more that you learn, the more places you'll go."
          </p>
        </div>
      </main>
    </div>
  );
}
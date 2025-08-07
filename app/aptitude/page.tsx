"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AptitudeTopic {
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
  progress: {
    attempted: number;
    total: number;
    percentage: number;
  };
}

interface CurrentTopicResponse {
  success: boolean;
  current_topic?: AptitudeTopic;
  message?: string;
  error?: string;
  completed?: boolean;
  total_attempted?: number;
}

interface AllTopicsResponse {
  success: boolean;
  topics?: TopicListItem[];
  meta?: {
    total_topics: number;
    current_topic_id: number;
    overall_progress: {
      total_attempted: number;
      questions_per_topic: number;
      current_topic_progress: number;
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

export default function AptitudeNineLives() {
  const [currentTopic, setCurrentTopic] = useState<AptitudeTopic | null>(null);
  const [allTopics, setAllTopics] = useState<TopicListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isShuffling, setIsShuffling] = useState(false);
  const [isLoadingNext, setIsLoadingNext] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [catAnimation, setCatAnimation] = useState('😺');
  const [randomMode, setRandomMode] = useState(false);
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

  // Fetch profile and current topic on component mount
  useEffect(() => {
    fetchProfile();
    fetchCurrentTopic();
    fetchAllTopics();
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

  const fetchCurrentTopic = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/get/aptitude?type=current');
      const data: CurrentTopicResponse = await response.json();
      
      if (data.success && data.current_topic) {
        setCurrentTopic(data.current_topic);
        setRandomMode(false);
      } else if (data.completed) {
        setError(`🎉 Congratulations! You've completed all available topics! Total questions attempted: ${data.total_attempted}`);
      } else {
        setError(data.message || data.error || 'Failed to fetch current topic');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error fetching current topic:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllTopics = async () => {
    try {
      const response = await fetch('/api/get/aptitude?type=all');
      const data: AllTopicsResponse = await response.json();
      
      if (data.success && data.topics) {
        setAllTopics(data.topics);
      }
    } catch (err) {
      console.error('Error fetching all topics:', err);
    }
  };

  const fetchRandomCompletedTopic = async () => {
    try {
      setIsShuffling(true);
      setError(null);
      
      // Get a random topic from completed topics
      const completedTopics = allTopics.filter(topic => topic.progress.attempted > 0);
      
      if (completedTopics.length === 0) {
        setError('No completed topics available for random mode');
        return;
      }
      
      const randomTopic = completedTopics[Math.floor(Math.random() * completedTopics.length)];
      
      const response = await fetch(`/api/get/aptitude?type=topic&topic_id=${randomTopic.id}`);
      const data = await response.json();
      
      if (data.success && data.topic) {
        // Convert topic to current topic format for display
        const topicData = data.topic;
        const randomCurrentTopic: AptitudeTopic = {
          id: topicData.id,
          topic_name: topicData.topic_name,
          description: topicData.description,
          questions_attempted: topicData.progress.attempted,
          current_question_in_topic: Math.floor(Math.random() * topicData.progress.attempted) + 1,
          total_questions_in_topic: topicData.progress.total,
          overall_progress: {
            total_attempted: data.meta?.overall_progress?.total_attempted || 0,
            current_topic_number: topicData.id
          }
        };
        setCurrentTopic(randomCurrentTopic);
        setRandomMode(true);
      } else {
        setError('Failed to fetch random topic');
      }
    } catch (err) {
      setError('Failed to shuffle topic');
      console.error('Error shuffling topic:', err);
    } finally {
      setIsShuffling(false);
    }
  };

  const handleTopicClick = () => {
    if (currentTopic) {
      if (randomMode) {
        // For random mode, go to the random question within the topic
        const questionNumber = (currentTopic.id - 1) * 50 + currentTopic.current_question_in_topic;
        router.push(`/aptitude/${questionNumber}`);
      } else {
        // For current topic, go to next unattempted question
        const nextQuestionNumber = (currentTopic.id - 1) * 50 + currentTopic.current_question_in_topic;
        router.push(`/aptitude/${nextQuestionNumber}`);
      }
    }
  };

  const handleViewList = () => {
    router.push('/aptitude/list');
  };

  const handleNextTopic = async () => {
    if (!currentTopic) return;
    
    try {
      setIsLoadingNext(true);
      setError(null);
      
      const nextTopicId = currentTopic.id + 1;
      const response = await fetch(`/api/get/aptitude?type=topic&topic_id=${nextTopicId}`);
      const data = await response.json();
      
      if (data.success && data.topic) {
        // Convert to current topic format
        const topicData = data.topic;
        const nextTopic: AptitudeTopic = {
          id: topicData.id,
          topic_name: topicData.topic_name,
          description: topicData.description,
          questions_attempted: topicData.progress.attempted,
          current_question_in_topic: topicData.progress.attempted + 1,
          total_questions_in_topic: topicData.progress.total,
          overall_progress: {
            total_attempted: data.meta?.overall_progress?.total_attempted || 0,
            current_topic_number: topicData.id
          }
        };
        setCurrentTopic(nextTopic);
        setRandomMode(false);
      } else {
        setError('No more topics available');
      }
    } catch (err) {
      setError('Failed to load next topic');
      console.error('Error loading next topic:', err);
    } finally {
      setIsLoadingNext(false);
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

  const streakDisplay = getStreakDisplay();

  return (
    <div className="min-h-screen bg-white text-black font-mono">
      {/* Header */}
      <header className="border-b border-gray-100 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-pulse">🐾</span>
            <a href="/home">
            <h1 className="text-2xl font-light">9lives <span className="text-sm text-gray-400">aptitude</span></h1>
            </a>
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
      <main className="max-w-7xl mx-auto">
        {/* Progress Section */}
        <div className="flex justify-end py-6 px-6">
          {currentTopic && (
            <div className="text-xs bg-gray-50 px-3 py-1 border border-gray-200 font-light">
              Progress: {currentTopic.overall_progress.total_attempted} questions attempted
              {randomMode && <span className="ml-2 text-purple-600">• Random Mode</span>}
            </div>
          )}
        </div>

        <div className="px-6">
          {error ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">😿</div>
              <div className="text-lg mb-6 text-red-400 font-light">{error}</div>
              <button
                onClick={fetchCurrentTopic}
                className="py-3 px-6 bg-black text-white font-light hover:bg-gray-800 transition-all duration-300"
              >
                Try Again
              </button>
            </div>
          ) : currentTopic ? (
            <>
              {/* Topic Card */}
              <div 
                onClick={handleTopicClick}
                className="bg-white border border-gray-100 hover:border-black cursor-pointer transition-all duration-300 hover:shadow-sm group mb-6"
              >
                <div className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-xs bg-black text-white px-3 py-1 font-light uppercase tracking-wider">
                      {randomMode ? 'RANDOM' : 'CURRENT'} TOPIC #{currentTopic.id}
                    </span>
                    <span className="text-xl group-hover:animate-bounce">
                      {randomMode ? '🎲' : '🎯'}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-light mb-4 leading-relaxed">
                    {currentTopic.topic_name}
                  </h3>
                  
                  {currentTopic.description && (
                    <div className="text-gray-600 mb-4">
                      <p className="bg-gray-50 p-4 border-l-2 border-black font-light text-sm">
                        {currentTopic.description}
                      </p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div className="bg-gray-50 p-3 border border-gray-200">
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Progress</div>
                      <div className="font-light">
                        {((currentTopic.questions_attempted - 1) % 50) + 1}/50 questions
                      </div>
                    </div>
                    <div className="bg-gray-50 p-3 border border-gray-200">
                      <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                        {randomMode ? 'Random Question' : 'Next Question'}
                      </div>
                      <div className="font-light">
                        #{currentTopic.current_question_in_topic}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-400 font-light">
                    <span>Click to {randomMode ? 'practice' : 'continue'} →</span>
                    <span>
                      {randomMode ? 'Random practice mode' : `Topic ${currentTopic.id} of ${allTopics.length}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid md:grid-cols-4 gap-4 mb-8">
                {/* Random Button */}
                <button
                  onClick={fetchRandomCompletedTopic}
                  disabled={isShuffling}
                  className="flex items-center justify-center gap-3 p-4 bg-white border border-gray-100 hover:border-purple-400 hover:bg-purple-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <span className="text-xl group-hover:animate-spin">🎲</span>
                  <div className="text-left">
                    <div className="font-light text-sm uppercase tracking-wider">RANDOM</div>
                    <div className="text-xs text-gray-400 font-light">
                      {isShuffling ? 'Shuffling...' : 'Practice mode'}
                    </div>
                  </div>
                </button>

                {/* Current Topic Button */}
                <button
                  onClick={fetchCurrentTopic}
                  className="flex items-center justify-center gap-3 p-4 bg-white text-black border border-gray-200 hover:border-black hover:bg-gray-50 transition-all duration-300 group"
                >
                  <span className="text-xl">🎯</span>
                  <div className="text-left">
                    <div className="font-light text-sm uppercase tracking-wider">CURRENT</div>
                    <div className="text-xs text-gray-400 font-light">Resume topic</div>
                  </div>
                </button>

                {/* Next Topic Button */}
                <button
                  onClick={handleNextTopic}
                  disabled={isLoadingNext}
                  className="flex items-center justify-center gap-3 p-4 bg-white border border-gray-100 hover:border-green-400 hover:bg-green-50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <span className="text-xl">⏭️</span>
                  <div className="text-left">
                    <div className="font-light text-sm uppercase tracking-wider">NEXT TOPIC</div>
                    <div className="text-xs text-gray-400 font-light">
                      {isLoadingNext ? 'Loading...' : 'Skip ahead'}
                    </div>
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
                    <div className="text-xs text-gray-400 font-light">All topics</div>
                  </div>
                </button>
              </div>

              {/* Cat wisdom footer */}
              <div className="text-center py-6 border-t border-gray-100">
                <div className="text-2xl mb-2">🐾</div>
                <p className="text-sm text-gray-400 font-light italic">
                  "A cat has nine lives. A student has unlimited practice attempts."
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <div className="text-5xl mb-4">😺</div>
              <div className="text-lg font-light">No topics available</div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
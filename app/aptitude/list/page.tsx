"use client"

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

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

export default function AptitudeListPage() {
  const [topics, setTopics] = useState<TopicListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<AllTopicsResponse['meta'] | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [catAnimation, setCatAnimation] = useState('😺');
  const router = useRouter();
  
  // Refs for scrolling to current topic
  const topicRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  const hasScrolled = useRef(false);

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

  useEffect(() => {
    fetchProfile();
    fetchAllTopics();
  }, []);

  // Auto-scroll to current topic when topics are loaded
  useEffect(() => {
    if (topics.length > 0 && !hasScrolled.current && !loading) {
      scrollToOngoingTopic();
      hasScrolled.current = true;
    }
  }, [topics, loading]);

  const scrollToOngoingTopic = () => {
    // Find the current topic or the first incomplete topic
    let targetTopic = topics.find(topic => topic.is_current);
    
    if (!targetTopic) {
      // If no current topic, find first incomplete topic
      targetTopic = topics.find(topic => topic.progress.percentage < 100);
    }
    
    if (!targetTopic) {
      // If all topics are complete, find the last topic
      targetTopic = topics[topics.length - 1];
    }
    
    if (targetTopic && topicRefs.current[targetTopic.id]) {
      const element = topicRefs.current[targetTopic.id];
      if (element) {
        // Add a small delay to ensure the page is fully rendered
        setTimeout(() => {
          element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          });
          
          // Add a subtle highlight effect
          element.classList.add('ring-2', 'ring-black', 'ring-opacity-20');
          setTimeout(() => {
            element.classList.remove('ring-2', 'ring-black', 'ring-opacity-20');
          }, 2000);
        }, 500);
      }
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

  const fetchAllTopics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/get/aptitude?type=all');
      const data: AllTopicsResponse = await response.json();
      
      if (data.success && data.topics) {
        setTopics(data.topics);
        setMeta(data.meta || null);
      } else {
        setError(data.message || data.error || 'Failed to fetch topics');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error fetching topics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTopicClick = (topic: TopicListItem) => {
    // Calculate the question number to navigate to
    let questionNumber: number;
    
    if (topic.progress.attempted >= topic.progress.total) {
      // All questions completed, go to first question
      questionNumber = topic.questions_range.start;
    } else {
      // Go to next unattempted question (attempted + 1)
      questionNumber = topic.questions_range.start + topic.progress.attempted;
    }
    
    router.push(`/aptitude/${questionNumber}`);
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

  // Helper function to get progress color based on percentage
  const getProgressColor = (percentage: number) => {
    if (percentage === 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    if (percentage >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getTopicStatus = (topic: TopicListItem) => {
    if (topic.is_current) return { text: 'CURRENT', color: 'bg-black text-white' };
    if (topic.progress.percentage === 100) return { text: 'COMPLETED', color: 'bg-green-100 text-green-800' };
    if (topic.progress.attempted > 0) return { text: 'IN PROGRESS', color: 'bg-blue-100 text-blue-800' };
    return { text: 'NOT STARTED', color: 'bg-gray-100 text-gray-600' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">{catAnimation}</div>
          <p className="font-mono text-gray-600 text-sm">Loading your topics...</p>
          <div className="mt-4 w-24 h-0.5 bg-gray-100 mx-auto overflow-hidden">
            <div className="h-full bg-black animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  const streakDisplay = getStreakDisplay();

  return (
    <div className="min-h-screen bg-white text-black font-mono">
      {/* Header - Compact */}
      <header className="border-b border-gray-100 py-3 sticky top-0 bg-white z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-6">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => router.push('/aptitude')}
              className="text-xl hover:scale-110 transition-transform duration-300"
            >
              🐾
            </button>
            <h1 className="text-xl font-light">9lives <span className="text-xs text-gray-400">topics</span></h1>
          </div>
          
          <div className="flex items-center gap-6">
            {profile && (
              <>
                <div className="text-center">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Streak</p>
                  <p className={`text-sm font-light ${streakDisplay.isGrayscale ? 'grayscale opacity-50' : ''}`}>
                    {streakDisplay.streakNumber} <span>{streakDisplay.emoji}</span>
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Fish</p>
                  <p className="text-sm font-light">{profile.progress.total_points} 🐟</p>
                </div>
                <div className="text-center hidden md:block">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">User</p>
                  <p className="text-xs font-light">{profile.email.split('@')[0]}</p>
                </div>
              </>
            )}
            <button 
              onClick={handleLogout}
              className="py-1.5 px-3 border border-gray-200 hover:border-black hover:bg-gray-50 transition-all duration-300 font-light text-xs"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content - Compact Height but Same Width */}
      <main className="max-w-7xl mx-auto px-6 py-6">
        {error ? (
          <div className="text-center py-8">
            <div className="text-3xl mb-3">😿</div>
            <div className="text-sm mb-4 text-red-400 font-light">{error}</div>
            <button
              onClick={fetchAllTopics}
              className="py-2 px-4 bg-black text-white font-light hover:bg-gray-800 transition-all duration-300 text-xs"
            >
              Try Again
            </button>
          </div>
        ) : (
          <>
            {/* Progress Section - Compact */}
            <div className="flex justify-between items-center py-3">
              <button
                onClick={scrollToOngoingTopic}
                className="text-xs bg-gray-50 px-2 py-1 border border-gray-200 font-light hover:border-black hover:bg-gray-100 transition-all duration-300"
              >
                📍 Jump to Current
              </button>
              {meta && (
                <div className="text-xs bg-gray-50 px-2 py-1 border border-gray-200 font-light">
                  {Math.floor((meta.overall_progress?.total_attempted || 0) / 50)} topics • {meta.overall_progress?.total_attempted || 0} questions
                </div>
              )}
            </div>

            {/* Topics List - Compact Cards */}
            <div className="space-y-2">
              {topics.map((topic) => {
                const status = getTopicStatus(topic);
                const progressColor = getProgressColor(topic.progress.percentage);
                
                return (
                  <div
                    key={topic.id}
                    ref={(el) => { topicRefs.current[topic.id] = el; }}
                    onClick={() => handleTopicClick(topic)}
                    className="bg-white border border-gray-100 hover:border-black cursor-pointer transition-all duration-300 hover:shadow-sm group scroll-mt-20"
                  >
                    <div className="p-4">
                      {/* Header Row - More Compact */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="text-sm font-light text-gray-400 w-8">
                            #{topic.id.toString().padStart(2, '0')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base font-light mb-0.5 group-hover:text-black transition-colors truncate">
                              {topic.topic_name}
                            </h3>
                            {topic.description && (
                              <p className="text-xs text-gray-600 font-light truncate">
                                {topic.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-xs px-1.5 py-0.5 font-light uppercase tracking-wider ${status.color}`}>
                            {status.text}
                          </span>
                          <span className="text-sm group-hover:animate-bounce">
                            {topic.progress.percentage === 100 ? '😸' : 
                             topic.progress.attempted > 0 ? '😺' : '🐱'}
                          </span>
                        </div>
                      </div>

                      {/* Compact Stats Row */}
                      <div className="grid grid-cols-4 gap-3 mb-2 text-xs">
                        <div className="bg-gray-50 p-2 text-center">
                          <div className="text-gray-400 uppercase tracking-wider mb-0.5">Progress</div>
                          <div className="font-light">{topic.progress.attempted}/{topic.progress.total}</div>
                        </div>
                        <div className="bg-gray-50 p-2 text-center">
                          <div className="text-gray-400 uppercase tracking-wider mb-0.5">Complete</div>
                          <div className="font-light">{topic.progress.percentage}%</div>
                        </div>
                        <div className="bg-gray-50 p-2 text-center">
                          <div className="text-gray-400 uppercase tracking-wider mb-0.5">Range</div>
                          <div className="font-light">{topic.questions_range.start}-{topic.questions_range.end}</div>
                        </div>
                        <div className="bg-gray-50 p-2 text-center">
                          <div className="text-gray-400 uppercase tracking-wider mb-0.5">Next</div>
                          <div className="font-light">
                            #{topic.progress.attempted >= topic.progress.total ? 
                              topic.questions_range.start : 
                              topic.questions_range.start + topic.progress.attempted}
                          </div>
                        </div>
                      </div>

                      {/* Compact Progress Bar */}
                      <div className="w-full bg-gray-200 h-0.5 mb-2">
                        <div 
                          className={`h-0.5 transition-all duration-500 ${progressColor}`}
                          style={{ width: `${topic.progress.percentage}%` }}
                        ></div>
                      </div>

                      {/* Action Text - Subtle */}
                      <div className="flex items-center justify-between text-xs text-gray-400 font-light">
                        <span>
                          {topic.progress.attempted >= topic.progress.total ? 'Review' : 'Continue'} →
                        </span>
                        <span>
                          {topic.progress.attempted >= topic.progress.total ? 
                            'Completed' : 
                            `${topic.progress.total - topic.progress.attempted} left`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Compact Footer */}
            <div className="text-center py-6 mt-8 border-t border-gray-100">
              <div className="text-lg mb-1">🐾</div>
              <p className="text-xs text-gray-400 font-light italic">
                "A curious cat explores every corner."
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
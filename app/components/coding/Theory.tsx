'use client';

import { useState, useEffect } from 'react';

interface UserProfile {
  id: string
  email: string
  coding_questions_attempted: number
  technical_questions_attempted: number
  fundamental_questions_attempted: number
  aptitude_questions_attempted?: number
  tech_topics_covered: number
  current_streak: [string, number] // Format: ["2025-08-04", 1]
  total_points: number
  total_questions_attempted: number
  categories: {
    coding: number
    technical: number
    fundamental: number
    aptitude: number
  }
  progress: {
    tech_topics_covered: number
    current_streak: [string, number]
    total_points: number
  }
  created_at: string
  updated_at: string
}

interface TheoryProps {
  question: string;
  approach: string;
  explanation: string;
  approachDetails: string;
  syntaxExplanation: Record<string, string>;
  keyInsights: string;
  whenToUse: string;
  timeComplexity: string;
  spaceComplexity: string;
  language: string;
  onNext: () => void;
}

export default function Theory({
  question,
  approach,
  explanation,
  approachDetails,
  syntaxExplanation,
  keyInsights,
  whenToUse,
  timeComplexity,
  spaceComplexity,
  language,
  onNext
}: TheoryProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  // Fetch user profile on component mount (similar to home page)
  useEffect(() => {
    fetchProfile();
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
      } else {
        console.error('Failed to fetch profile');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  // Function to get streak display based on current_streak data
  const getStreakDisplay = () => {
    if (!profile?.current_streak || !Array.isArray(profile.current_streak)) {
      return { number: '0', emoji: '🔥', isGray: true };
    }

    const [streakDate, streakDays] = profile.current_streak;
    const today = new Date().toISOString().split('T')[0]; // Format: "2025-08-04"
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (streakDate === today) {
      // Today - show normal colors
      return { number: streakDays.toString(), emoji: '🔥', isGray: false };
    } else if (streakDate === yesterday) {
      // Yesterday - show gray
      return { number: streakDays.toString(), emoji: '🔥', isGray: true };
    } else {
      // Before yesterday - show 0 in gray
      return { number: '0', emoji: '🔥', isGray: true };
    }
  };

  const handleNext = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      // Call the simplified API endpoint
      const response = await fetch('/api/add/points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ points: 1 }),
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        
        // Wait for 1 second before showing animation
        setTimeout(() => {
          // Update profile points based on the response
          if (data.new_total && profile) {
            setProfile(prev => prev ? {
              ...prev,
              total_points: data.new_total,
              progress: {
                ...prev.progress,
                total_points: data.new_total
              }
            } : null);
          } else if (profile) {
            // Fallback: increment by 1
            setProfile(prev => prev ? {
              ...prev,
              total_points: prev.total_points + 1,
              progress: {
                ...prev.progress,
                total_points: prev.total_points + 1
              }
            } : null);
          }
          
          setShowAnimation(true);
          
          // Hide animation after 2 seconds
          setTimeout(() => {
            setShowAnimation(false);
          }, 2000);
          
          // Call the original onNext after animation completes
          setTimeout(() => {
            onNext();
          }, 2500);
        }, 1000);
      } else {
        const errorData = await response.json();
        console.error('Failed to add points:', errorData);
        onNext(); // Still proceed even if API fails
      }
    } catch (error) {
      console.error('Error adding points:', error);
      onNext(); // Still proceed even if API fails
    } finally {
      setIsLoading(false);
    }
  };

  const streakDisplay = getStreakDisplay();

  return (
    <div className="min-h-screen bg-white text-black font-mono pb-20 pt-20">
      {/* Header - Same as home page */}
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-100 py-4 z-20">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-pulse">🐾</span>
            <h1 className="text-2xl font-light">9lives</h1>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Fish</p>
              <p className="text-lg font-light">
                {profileLoading ? (
                  <span className="animate-pulse">Loading...</span>
                ) : (
                  <>
                    {profile?.total_points || 0} 🐟
                    {showAnimation && (
                      <span className="inline-block ml-2">
                        <span className="animate-bounce text-2xl">+1</span>
                        <span className="inline-block animate-bounce ml-1" style={{animationDelay: '0.2s'}}>🐟</span>
                      </span>
                    )}
                  </>
                )}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Streak</p>
              <p className={`text-lg font-light ${streakDisplay.isGray ? 'text-gray-400' : ''}`}>
                {profileLoading ? (
                  <span className="animate-pulse">Loading...</span>
                ) : (
                  <>
                    <span className={streakDisplay.isGray ? 'text-gray-400' : ''}>{streakDisplay.number}</span>
                    {' '}
                    <span className={streakDisplay.isGray ? 'grayscale opacity-50' : ''}>{streakDisplay.emoji}</span>
                  </>
                )}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Language</p>
              <p className="text-lg font-light">{language.toUpperCase()}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Question Title */}
        <div className="text-center mb-12">
          <div className="text-4xl mb-4">🧠</div>
          <h2 className="text-3xl font-light mb-3">{question}</h2>
          <p className="text-lg text-gray-600 font-light">
            Understanding the theory behind the solution
          </p>
        </div>

        {/* Content Grid */}
        <div className="space-y-8">
          {/* Approach & Explanation Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white border border-gray-100 hover:border-black transition-all duration-500 group">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl group-hover:animate-bounce transition-all duration-300">🎯</span>
                  <h3 className="font-mono font-medium text-xl">Approach</h3>
                </div>
                <p className="text-gray-700 font-light leading-relaxed">{approach}</p>
              </div>
            </div>
            <div className="bg-white border border-gray-100 hover:border-black transition-all duration-500 group">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl group-hover:animate-bounce transition-all duration-300">💡</span>
                  <h3 className="font-mono font-medium text-xl">Explanation</h3>
                </div>
                <p className="text-gray-700 font-light leading-relaxed">{explanation}</p>
              </div>
            </div>
          </div>

          {/* Technical Details */}
          <div className="bg-white border border-gray-100 hover:border-black transition-all duration-500 group">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl group-hover:animate-bounce transition-all duration-300">⚙️</span>
                <h3 className="font-mono font-medium text-xl">Technical Details</h3>
              </div>
              <p className="text-gray-700 font-light leading-relaxed">{approachDetails}</p>
            </div>
          </div>

          {/* Syntax & Explanation */}
          {syntaxExplanation && Object.keys(syntaxExplanation).length > 0 && (
            <div className="bg-white border border-gray-100 hover:border-black transition-all duration-500 group">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl group-hover:animate-bounce transition-all duration-300">📝</span>
                  <h3 className="font-mono font-medium text-xl">Syntax & Explanation</h3>
                </div>
                <div className="space-y-4">
                  {Object.entries(syntaxExplanation).map(([key, value]) => (
                    <div key={key} className="border-l-2 border-gray-100 pl-4 hover:border-black transition-colors duration-300">
                      <div className="bg-gray-50 px-3 py-2 font-mono text-sm mb-2 inline-block">
                        {key}
                      </div>
                      <p className="text-gray-700 font-light text-sm leading-relaxed">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Key Insights & When to Use Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white border border-gray-100 hover:border-black transition-all duration-500 group">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl group-hover:animate-bounce transition-all duration-300">🔑</span>
                  <h3 className="font-mono font-medium text-xl">Key Insights</h3>
                </div>
                <p className="text-gray-700 font-light leading-relaxed">{keyInsights}</p>
              </div>
            </div>
            <div className="bg-white border border-gray-100 hover:border-black transition-all duration-500 group">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl group-hover:animate-bounce transition-all duration-300">🎪</span>
                  <h3 className="font-mono font-medium text-xl">When to Use</h3>
                </div>
                <p className="text-gray-700 font-light leading-relaxed">{whenToUse}</p>
              </div>
            </div>
          </div>

          {/* Complexity Analysis */}
          <div className="bg-gray-50 py-8">
            <h3 className="text-xl font-light text-center mb-8">Complexity Analysis</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="bg-white border border-gray-100 hover:border-black transition-all duration-500 group text-center">
                <div className="p-6">
                  <div className="text-3xl mb-3 group-hover:animate-bounce transition-all duration-300">⏱️</div>
                  <h4 className="font-mono font-medium text-lg mb-3">Time Complexity</h4>
                  <p className="text-lg font-light text-gray-700">{timeComplexity}</p>
                </div>
              </div>
              <div className="bg-white border border-gray-100 hover:border-black transition-all duration-500 group text-center">
                <div className="p-6">
                  <div className="text-3xl mb-3 group-hover:animate-bounce transition-all duration-300">💾</div>
                  <h4 className="font-mono font-medium text-lg mb-3">Space Complexity</h4>
                  <p className="text-lg font-light text-gray-700">{spaceComplexity}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Fixed Footer with Next Button */}
      <div className="fixed bottom-0 right-0 p-4 z-10">
        <button 
          onClick={handleNext}
          disabled={isLoading}
          className="py-2 px-4 bg-black text-white text-sm font-mono hover:bg-gray-800 transition-all duration-300 hover:scale-105 group disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="flex items-center gap-2">
            {isLoading ? 'Loading...' : 'Next'}
            {!isLoading && (
              <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
            )}
          </span>
        </button>
      </div>
    </div>
  );
}
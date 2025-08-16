'use client';
import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';

interface TestResult {
  passed: boolean;
  input: string;
  expected: string;
  output: string;
}

interface SubmissionResult {
  success: boolean;
  message: string;
  testResults?: TestResult[];
}

interface StreakResponse {
  success: boolean;
  message: string;
  previous_streak?: number;
  current_streak: number;
  last_update_date: string;
  action: 'incremented' | 'no_change';
}

interface ResultPopupProps {
  result: SubmissionResult;
  onClose: () => void;
}

// Cache utilities
const CACHE_KEY = 'dancing_cat_gif';
const CACHE_TIMESTAMP_KEY = 'dancing_cat_gif_timestamp';

const getCachedGif = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CACHE_KEY);
};

const setCachedGif = (dataUrl: string) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CACHE_KEY, dataUrl);
  localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
};

const isCacheValid = (): boolean => {
  if (typeof window === 'undefined') return false;
  const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
  if (!timestamp) return false;
  return true;
};

// Enhanced confetti burst
const triggerEnhancedConfetti = () => {
  const duration = 2000;
  const animationEnd = Date.now() + duration;
  const defaults = { 
    startVelocity: 30, 
    spread: 360, 
    ticks: 60, 
    zIndex: 1000,
    colors: ['#ff6b35', '#f7931e', '#ffcc02', '#ffd700', '#ff9500', '#ffb347']
  };
  
  const randomInRange = (min: number, max: number) =>
    Math.random() * (max - min) + min;
    
  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) {
      return clearInterval(interval);
    }
    
    const particleCount = 50 * (timeLeft / duration);
    
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.9), y: Math.random() - 0.2 },
    });
  }, 250);
};

// Helper function to get current question number from URL
const getCurrentQuestionNumber = (): number => {
  if (typeof window === 'undefined') return 1;
  const path = window.location.pathname;
  const match = path.match(/\/coding\/(\d+)/);
  return match ? parseInt(match[1], 10) : 1;
};

// Helper function to navigate
const navigateToQuestion = (questionNumber: number, lang?: 'python') => {
  if (typeof window === 'undefined') return;
  const baseUrl = `/coding/${questionNumber}`;
  const url = lang ? `${baseUrl}?lang=python` : baseUrl;
  window.location.href = url;
};

export default function ResultPopup({ result, onClose }: ResultPopupProps) {
  const [gifUrl, setGifUrl] = useState<string>('');
  const [gifStatus, setGifStatus] = useState<'loading' | 'cached' | 'online' | 'error'>('loading');
  const [streak, setStreak] = useState<StreakResponse | null>(null);
  const [showStreakAnimation, setShowStreakAnimation] = useState(false);
  const [animatingNumber, setAnimatingNumber] = useState<number>(0);
  const [emojiState, setEmojiState] = useState<'grey' | 'growing' | 'lit'>('grey');

  // Load GIF with caching
  useEffect(() => {
    const loadGif = async () => {
      if (isCacheValid()) {
        const cached = getCachedGif();
        if (cached) {
          setGifUrl(cached);
          setGifStatus('cached');
          return;
        }
      }

      try {
        setGifStatus('loading');
        const response = await fetch('https://jfxihkyidrxhdyvdygnt.supabase.co/storage/v1/object/public/gifs/happy.gif');
        const blob = await response.blob();
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        
        setCachedGif(dataUrl);
        setGifUrl(dataUrl);
        setGifStatus('online');
      } catch (error) {
        console.error('Failed to load GIF:', error);
        setGifStatus('error');
      }
    };

    loadGif();
  }, []);

  // Update streak and coding questions attempted count
  useEffect(() => {
    const updateStats = async () => {
      try {
        // Update streak
        const streakResponse = await fetch('/api/add/streak', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const streakData: StreakResponse = await streakResponse.json();
        setStreak(streakData);

        // Update coding questions attempted count
        const updateTodayResponse = await fetch(`/api/update/today?inc=coding_questions_attempted`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!updateTodayResponse.ok) {
          console.warn('Failed to update coding questions attempted count');
        }

        // If streak was incremented, start the sequence
        if (streakData.action === 'incremented' && streakData.previous_streak !== undefined) {
          setShowStreakAnimation(true);
          setAnimatingNumber(streakData.previous_streak);
          
          // Animation sequence
          setTimeout(() => {
            setEmojiState('growing');
            
            // Start number animation
            const startNum = streakData.previous_streak!;
            const endNum = streakData.current_streak;
            const duration = 1800;
            const steps = 25;
            const increment = (endNum - startNum) / steps;
            
            let currentStep = 0;
            const interval = setInterval(() => {
              currentStep++;
              if (currentStep >= steps) {
                setAnimatingNumber(endNum);
                setEmojiState('lit');
                triggerEnhancedConfetti();
                clearInterval(interval);
              } else {
                setAnimatingNumber(Math.floor(startNum + (increment * currentStep)));
              }
            }, duration / steps);
          }, 500);
        }
      } catch (error) {
        console.error('Failed to update stats:', error);
      }
    };

    updateStats();
  }, []);

  const getEmojiStyle = () => {
    switch (emojiState) {
      case 'grey':
        return 'grayscale text-2xl transform scale-75 opacity-60 transition-all duration-700';
      case 'growing':
        return 'text-2xl transform scale-90 transition-all duration-800 opacity-90';
      case 'lit':
        return 'text-2xl transform scale-100 transition-all duration-800 text-orange-500 animate-pulse';
      default:
        return 'text-2xl';
    }
  };

  const handlePythonClick = () => {
    const currentQuestion = getCurrentQuestionNumber();
    navigateToQuestion(currentQuestion, 'python');
  };

  const handleNextQuestionClick = () => {
    const currentQuestion = getCurrentQuestionNumber();
    navigateToQuestion(currentQuestion + 1);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-gray-100">
          
          {/* Minimal Header */}
          <div className="p-6 pb-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="text-xl font-mono font-semibold text-gray-900">
                Purrfect! 🐾
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors text-xl w-6 h-6 flex items-center justify-center"
              >
                ×
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 text-center space-y-6">
            
            {/* Cat GIF - Minimal */}
            <div className="flex justify-center">
              {gifStatus === 'loading' && (
                <div className="w-24 h-32 bg-gray-50 border border-gray-200 flex items-center justify-center rounded-xl">
                  <div className="text-gray-400 text-xs font-mono">loading...</div>
                </div>
              )}
              {gifStatus === 'error' && (
                <div className="w-24 h-32 bg-gray-50 border border-gray-200 flex items-center justify-center rounded-xl">
                  <div className="text-gray-400 text-xs font-mono">error</div>
                </div>
              )}
              {(gifStatus === 'cached' || gifStatus === 'online') && gifUrl && (
                <img 
                  src={gifUrl} 
                  alt="Success" 
                  className="w-24 h-32 object-cover rounded-xl border border-gray-200"
                />
              )}
            </div>

            {/* Streak Display - Clean and Modern */}
            {streak && streak.action === 'incremented' && showStreakAnimation && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <span className={getEmojiStyle()}>🔥</span>
                  <div className="text-center">
                    <div className="font-mono font-bold text-3xl text-gray-900 transition-all duration-300">
                      {animatingNumber}
                    </div>
                    <div className="text-gray-500 text-xs font-mono uppercase tracking-wider mt-1">
                      streak
                    </div>
                  </div>
                </div>
                
                <p className="text-gray-600 font-mono text-sm">
                  {emojiState === 'lit' ? "you're on fire! 🚀" : "building streak..."}
                </p>
              </div>
            )}

            {/* Regular streak display */}
            {streak && streak.action === 'no_change' && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <span className="text-2xl">🔥</span>
                  <div className="text-center">
                    <div className="font-mono font-bold text-2xl text-gray-900">{streak.current_streak}</div>
                    <div className="text-gray-500 text-xs font-mono uppercase tracking-wider">streak</div>
                  </div>
                  <span className="text-2xl">🔥</span>
                </div>
                <p className="text-gray-600 font-mono text-sm">keep it up! 💪</p>
              </div>
            )}

            {/* Minimal Success Message */}
            <div className="space-y-2">
              <div className="text-lg font-mono font-semibold text-gray-900">
                well done
              </div>
              <div className="text-gray-500 text-sm font-mono">
                +5 points earned
              </div>
            </div>
          </div>

          {/* Clean Footer */}
          <div className="p-6 pt-4 border-t border-gray-100 bg-gray-50">
            <div className="flex gap-3">
              <button
                onClick={handlePythonClick}
                className="flex-1 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all font-mono text-sm rounded-lg"
              >
                🐍 python
              </button>
              <button
                onClick={handleNextQuestionClick}
                className="flex-1 px-4 py-2.5 bg-black text-white hover:bg-gray-800 transition-all font-mono text-sm rounded-lg"
              >
                next →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
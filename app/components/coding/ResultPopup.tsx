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

// Enhanced confetti fireworks effect - longer duration
const triggerConfettiFireworks = () => {
  const duration = 3000; // 3 seconds (increased from 1 second)
  const animationEnd = Date.now() + duration;
  const defaults = { 
    startVelocity: 30, 
    spread: 360, 
    ticks: 60, 
    zIndex: 1000,
    colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff']
  };
  
  const randomInRange = (min: number, max: number) =>
    Math.random() * (max - min) + min;
    
  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) {
      return clearInterval(interval);
    }
    
    const particleCount = 50 * (timeLeft / duration);
    
    // Left side firework
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
    });
    
    // Right side firework
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
    });
  }, 150); // Faster intervals for more continuous effect
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

  // Load GIF with caching (only for successful results)
  useEffect(() => {
    if (!result.success) return;
    
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
  }, [result.success]);

  // Update streak and trigger confetti on mount (only for successful results)
  useEffect(() => {
    if (!result.success) return;
    
    // Single confetti trigger with longer duration
    triggerConfettiFireworks();
    
    const updateStreak = async () => {
      try {
        const response = await fetch('/api/add/streak', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const streakData: StreakResponse = await response.json();
        setStreak(streakData);
      } catch (error) {
        console.error('Failed to update streak:', error);
      }
    };

    updateStreak();
  }, [result.success]);

  const getGifTooltip = () => {
    switch (gifStatus) {
      case 'cached': return 'Loaded from cache';
      case 'online': return 'Fetched online and cached';
      case 'loading': return 'Loading...';
      case 'error': return 'Failed to load';
      default: return '';
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
    <div className="fixed inset-0 z-50 bg-white">
      {/* Only render if successful */}
      {result.success && (
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-200">
          
          {/* Header */}
          <div className="bg-green-50 p-6 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-3xl">🎉</span>
                <div>
                  <h1 className="text-xl font-mono font-bold text-green-800">
                    Purrfect Submission! 🐱
                  </h1>
                  <p className="text-green-600 text-sm mt-1">
                    Great job solving this challenge!
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-black transition-colors text-2xl font-mono w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full"
              >
                ×
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 text-center space-y-6">
            
            {/* Dancing Cat GIF */}
            <div className="flex justify-center">
              {gifStatus === 'loading' && (
                <div className="w-48 h-64 bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center rounded-lg">
                  <div className="text-gray-500 text-sm">Loading cat... 🐱</div>
                </div>
              )}
              {gifStatus === 'error' && (
                <div className="w-48 h-64 bg-red-50 border-2 border-dashed border-red-300 flex items-center justify-center rounded-lg">
                  <div className="text-red-500 text-sm">😿 Cat failed to load</div>
                </div>
              )}
              {(gifStatus === 'cached' || gifStatus === 'online') && gifUrl && (
                <div className="relative group">
                  <img 
                    src={gifUrl} 
                    alt="Dancing cat celebration" 
                    className="w-48 h-64 object-cover rounded-lg shadow-lg"
                  />
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {getGifTooltip()}
                  </div>
                </div>
              )}
            </div>

            {/* Streak Display */}
            {streak && streak.action === 'incremented' && (
              <div className="bg-gradient-to-r from-orange-100 to-yellow-100 border-2 border-orange-300 rounded-lg p-4">
                <div className="flex items-center justify-center gap-3 text-2xl mb-2">
                  <span className="animate-bounce">🔥</span>
                  <span className="font-bold text-orange-600 text-3xl">{streak.current_streak}</span>
                  <span className="animate-bounce">🔥</span>
                </div>
                <p className="text-orange-700 font-semibold">
                  Meow-nificent streak! You're on fire! 🚀
                </p>
              </div>
            )}

            {/* Success Message */}
            <div className="space-y-2">
              <div className="text-xl font-bold text-green-700">
                Claw-some job! 🌟
              </div>
              <div className="text-gray-600">
                You've earned your cat-titude badge! 😸
              </div>
            </div>
          </div>

          {/* Footer with new button options */}
          <div className="p-4 border-t bg-gray-50">
            <div className="flex justify-between items-center mb-3">
              <div className="text-gray-600 flex items-center gap-2">
                <span>🐟</span>
                <span>+5 fishes earned!</span>
              </div>
            </div>
            
            {/* New button layout */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={handlePythonClick}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-all duration-300 font-mono rounded-lg flex items-center gap-2"
              >
                🐍 Python
              </button>
              <button
                onClick={handleNextQuestionClick}
                className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 transition-all duration-300 font-mono rounded-lg flex items-center gap-2"
              >
                Next Question ➡️
              </button>
            </div>
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
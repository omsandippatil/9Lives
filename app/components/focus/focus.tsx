'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

interface FocusOverlayProps {
  autoStart?: boolean;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function FocusOverlay({ autoStart = false }: FocusOverlayProps) {
  const [isActive, setIsActive] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const supabaseTimeRef = useRef<number>(0); // Track the last known Supabase value
  const GOAL_SECONDS = 6 * 60 * 60; // 6 hours in seconds

  // Get cache key for today's data
  const getCacheKey = useCallback(() => {
    const today = new Date().toDateString();
    return `focus_time_${today}_${userId}`;
  }, [userId]);

  // Load data from sessionStorage
  const loadFromSessionStorage = useCallback(() => {
    if (!userId) return 0;
    
    try {
      const cacheKey = getCacheKey();
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const data = JSON.parse(cached);
        const today = new Date().toDateString();
        if (data.date === today && data.userId === userId) {
          return data.time || 0;
        }
      }
    } catch (e) {
      console.error('Error loading from sessionStorage:', e);
    }
    return 0;
  }, [userId, getCacheKey]);

  // Save data to sessionStorage
  const saveToSessionStorage = useCallback((time: number) => {
    if (!userId) return;
    
    try {
      const cacheKey = getCacheKey();
      const data = {
        time,
        date: new Date().toDateString(),
        timestamp: Date.now(),
        userId
      };
      sessionStorage.setItem(cacheKey, JSON.stringify(data));
      console.log('Saved to sessionStorage:', time);
    } catch (e) {
      console.error('Error saving to sessionStorage:', e);
    }
  }, [userId, getCacheKey]);

  // Get user data from cookies
  const getUserFromCookies = useCallback(() => {
    try {
      const authSession = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-session='));
      
      if (authSession) {
        const sessionData = JSON.parse(decodeURIComponent(authSession.split('=')[1]));
        return {
          id: sessionData.user_id,
          access_token: sessionData.access_token,
          refresh_token: sessionData.refresh_token || '',
          expires_at: sessionData.expires_at
        };
      }

      // Fallback to individual cookies
      const userIdCookie = document.cookie
        .split('; ')
        .find(row => row.startsWith('client-user-id='));
      
      if (userIdCookie) {
        return {
          id: userIdCookie.split('=')[1],
          access_token: '',
          refresh_token: '',
          expires_at: Date.now() + 24 * 60 * 60 * 1000
        };
      }
    } catch (error) {
      console.error('Error parsing auth cookies:', error);
    }
    return null;
  }, []);

  // Initialize authentication
  const initializeAuth = useCallback(() => {
    const userAuth = getUserFromCookies();
    
    if (userAuth && userAuth.id) {
      setUserId(userAuth.id);
      setIsAuthenticated(true);
      console.log('Authenticated user:', userAuth.id);
      return true;
    }
    
    console.log('No valid authentication found');
    return false;
  }, [getUserFromCookies]);

  // Load today's focus time from Supabase
  const loadFromSupabase = useCallback(async () => {
    if (!userId || !isAuthenticated) return 0;

    try {
      const { data, error } = await supabase
        .from('today')
        .select('focus')
        .eq('uid', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('No focus record for today');
          return 0;
        }
        console.error('Error loading focus time:', error);
        return 0;
      }

      const focusTime = data?.focus || 0;
      supabaseTimeRef.current = focusTime; // Store the Supabase value
      console.log('Loaded from Supabase:', focusTime);
      return focusTime;
    } catch (error) {
      console.error('Error in loadFromSupabase:', error);
      return 0;
    }
  }, [userId, isAuthenticated]);

  // Save focus time to Supabase (only when current time > supabase time)
  const saveToSupabase = useCallback(async (time: number, force: boolean = false) => {
    if (!userId || !isAuthenticated || time <= 0) {
      return;
    }

    // Only save if current time is greater than stored Supabase time, or if forced
    if (!force && time <= supabaseTimeRef.current) {
      console.log('Skipping Supabase save - current time not greater than stored:', { current: time, stored: supabaseTimeRef.current });
      return;
    }

    try {
      const { error } = await supabase
        .from('today')
        .upsert({
          uid: userId,
          focus: time
        }, {
          onConflict: 'uid'
        });

      if (error) {
        console.error('Error saving to Supabase:', error);
      } else {
        supabaseTimeRef.current = time; // Update our reference
        console.log('Saved to Supabase:', time);
      }
    } catch (error) {
      console.error('Error in saveToSupabase:', error);
    }
  }, [userId, isAuthenticated]);

  // Initialize component on mount
  useEffect(() => {
    const initialize = async () => {
      const authSuccess = initializeAuth();
      
      if (authSuccess) {
        // Load from Supabase first to get the baseline
        const supabaseTime = await loadFromSupabase();
        
        // Then check sessionStorage
        const cachedTime = loadFromSessionStorage();
        
        // Use the higher value
        const finalTime = Math.max(supabaseTime, cachedTime);
        setTimeSpent(finalTime);
        
        console.log('Initialization:', { supabaseTime, cachedTime, finalTime });
        
        // If cached time is higher than Supabase, save it to Supabase
        if (cachedTime > supabaseTime) {
          await saveToSupabase(cachedTime, true);
        }
        
        if (autoStart) {
          setIsActive(true);
          setIsRunning(true);
        }
      }
    };

    initialize();
  }, [autoStart, initializeAuth, loadFromSessionStorage, loadFromSupabase, saveToSupabase]);

  // Timer that only updates state every second
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && isAuthenticated) {
      interval = setInterval(() => {
        setTimeSpent(prev => {
          const newTime = prev + 1;
          // Save to sessionStorage every 10 seconds to prevent data loss
          if (newTime % 10 === 0) {
            saveToSessionStorage(newTime);
          }
          return newTime;
        });
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [isRunning, isAuthenticated, saveToSessionStorage]);

  // Handle page unload events - save to both sessionStorage and Supabase
  useEffect(() => {
    const handleSaveOnUnload = async () => {
      if (timeSpent > 0 && userId && isAuthenticated) {
        saveToSessionStorage(timeSpent);
        // Only save to Supabase if current time is greater than stored time
        await saveToSupabase(timeSpent);
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      handleSaveOnUnload();
      // Note: async operations may not complete in beforeunload
      // but we still try for better data persistence
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleSaveOnUnload();
      }
    };

    // Use addEventListener with proper cleanup
    const beforeUnloadHandler = (e: BeforeUnloadEvent) => handleBeforeUnload(e);
    
    window.addEventListener('beforeunload', beforeUnloadHandler);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('beforeunload', beforeUnloadHandler);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      // Save when component unmounts
      handleSaveOnUnload();
    };
  }, [timeSpent, userId, isAuthenticated, saveToSessionStorage, saveToSupabase]);

  // Get tier based on progress
  const getTier = (): { emoji: string; name: string; bg: string; text: string } => {
    const progress = timeSpent / GOAL_SECONDS;
    
    if (progress >= 1) return { 
      emoji: '😻', 
      name: 'Diamond', 
      bg: 'bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500',
      text: 'text-white'
    };
    if (progress >= 0.83) return { 
      emoji: '😸', 
      name: 'Gold', 
      bg: 'bg-gradient-to-br from-yellow-400 to-yellow-600',
      text: 'text-black'
    };
    if (progress >= 0.66) return { 
      emoji: '😺', 
      name: 'Silver', 
      bg: 'bg-gradient-to-br from-gray-300 to-gray-500',
      text: 'text-black'
    };
    if (progress >= 0.5) return { 
      emoji: '😽', 
      name: 'Bronze', 
      bg: 'bg-gradient-to-br from-orange-400 to-orange-600',
      text: 'text-white'
    };
    if (progress >= 0.33) return { 
      emoji: '😼', 
      name: 'Blue', 
      bg: 'bg-gradient-to-br from-blue-500 to-blue-700',
      text: 'text-white'
    };
    return { 
      emoji: '🐱', 
      name: 'Black', 
      bg: 'bg-gradient-to-br from-gray-800 to-black',
      text: 'text-white'
    };
  };

  // Format time display
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${hours}h ${minutes.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
  };

  // Calculate progress percentage
  const getProgress = (): number => {
    return Math.min((timeSpent / GOAL_SECONDS) * 100, 100);
  };

  const tier = getTier();

  // Don't render if not authenticated or not active
  if (!isAuthenticated || !isActive) {
    return null;
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {/* Timer display in bottom left */}
      <div className="absolute bottom-2 left-2 pointer-events-auto">
        <div className={`${tier.bg} ${tier.text} px-2 py-1 text-sm font-mono flex items-center gap-1.5 transition-all duration-500 ease-in-out transform hover:scale-105 shadow-sm rounded`}>
          <span className="text-sm transition-transform duration-300 hover:scale-110">{tier.emoji}</span>
          <span className="tabular-nums transition-colors duration-300">{formatTime(timeSpent)}</span>
        </div>
      </div>


    </div>
  );
}
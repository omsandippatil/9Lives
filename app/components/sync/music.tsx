"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface PlaylistItem {
  id: string;
  title: string;
  videoId: string;
  thumbnail?: string;
  originalIndex?: number; // For tracking original position when shuffled
}

interface YouTubePlaylistStreamerProps {
  playlistId: string;
}

const YouTubePlaylistStreamer: React.FC<YouTubePlaylistStreamerProps> = ({ 
  playlistId
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isRepeat, setIsRepeat] = useState(false);
  const [isShuffled, setIsShuffled] = useState(false);
  const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
  const [originalPlaylist, setOriginalPlaylist] = useState<PlaylistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const playerRef = useRef<any>(null);
  const isInitialized = useRef(false);

  // Cache keys for localStorage
  const CACHE_KEYS = {
    lastVideoId: `youtube_playlist_${playlistId}_lastVideoId`,
    isShuffled: `youtube_playlist_${playlistId}_isShuffled`,
    isRepeat: `youtube_playlist_${playlistId}_isRepeat`,
    shuffledOrder: `youtube_playlist_${playlistId}_shuffledOrder`,
    volume: `youtube_playlist_${playlistId}_volume`
  };

  // Get API key from environment variables
  const getApiKey = () => {
    const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
    
    if (!apiKey) {
      throw new Error('YouTube API key not found. Please set NEXT_PUBLIC_YOUTUBE_API_KEY in your .env file');
    }
    
    return apiKey;
  };

  // Cache management functions
  const saveToCache = (key: string, value: any) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.warn('Failed to save to cache:', error);
      }
    }
  };

  const getFromCache = (key: string) => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(key);
        return cached ? JSON.parse(cached) : null;
      } catch (error) {
        console.warn('Failed to read from cache:', error);
        return null;
      }
    }
    return null;
  };

  // Save current track to cache
  const saveCurrentTrack = useCallback(() => {
    if (playlist[currentTrack]?.videoId) {
      saveToCache(CACHE_KEYS.lastVideoId, playlist[currentTrack].videoId);
    }
  }, [playlist, currentTrack, CACHE_KEYS.lastVideoId]);

  // Load cached preferences
  const loadCachedPreferences = useCallback(() => {
    const cachedIsShuffled = getFromCache(CACHE_KEYS.isShuffled);
    const cachedIsRepeat = getFromCache(CACHE_KEYS.isRepeat);
    
    if (cachedIsShuffled !== null) {
      setIsShuffled(cachedIsShuffled);
    }
    if (cachedIsRepeat !== null) {
      setIsRepeat(cachedIsRepeat);
    }
  }, [CACHE_KEYS]);

  // Find track index by video ID
  const findTrackByVideoId = useCallback((videoId: string, targetPlaylist: PlaylistItem[]) => {
    return targetPlaylist.findIndex(item => item.videoId === videoId);
  }, []);

  // Shuffle array function
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // Toggle shuffle mode
  const toggleShuffle = useCallback(() => {
    if (!isShuffled) {
      // Enable shuffle
      const currentVideoId = playlist[currentTrack]?.videoId;
      const shuffledPlaylist = shuffleArray(originalPlaylist);
      
      // Find the current track in the shuffled playlist
      const newCurrentIndex = shuffledPlaylist.findIndex(item => item.videoId === currentVideoId);
      
      setPlaylist(shuffledPlaylist);
      setCurrentTrack(newCurrentIndex !== -1 ? newCurrentIndex : 0);
      setIsShuffled(true);
      
      // Cache the shuffled order and preference
      saveToCache(CACHE_KEYS.shuffledOrder, shuffledPlaylist.map(item => item.videoId));
      saveToCache(CACHE_KEYS.isShuffled, true);
    } else {
      // Disable shuffle - restore original order
      const currentVideoId = playlist[currentTrack]?.videoId;
      const originalIndex = originalPlaylist.findIndex(item => item.videoId === currentVideoId);
      
      setPlaylist([...originalPlaylist]);
      setCurrentTrack(originalIndex !== -1 ? originalIndex : 0);
      setIsShuffled(false);
      
      // Clear cached shuffle data
      saveToCache(CACHE_KEYS.shuffledOrder, null);
      saveToCache(CACHE_KEYS.isShuffled, false);
    }
  }, [playlist, currentTrack, originalPlaylist, isShuffled, CACHE_KEYS]);

  // Apply cached shuffle order if available
  const applyCachedShuffle = useCallback((loadedPlaylist: PlaylistItem[]) => {
    const cachedIsShuffled = getFromCache(CACHE_KEYS.isShuffled);
    const cachedShuffledOrder = getFromCache(CACHE_KEYS.shuffledOrder);
    
    if (cachedIsShuffled && cachedShuffledOrder && Array.isArray(cachedShuffledOrder)) {
      // Reconstruct shuffled playlist from cached order
      const shuffledPlaylist: PlaylistItem[] = [];
      
      cachedShuffledOrder.forEach(videoId => {
        const item = loadedPlaylist.find(track => track.videoId === videoId);
        if (item) {
          shuffledPlaylist.push(item);
        }
      });
      
      // Add any new items that weren't in the cached order
      loadedPlaylist.forEach(item => {
        if (!shuffledPlaylist.find(track => track.videoId === item.videoId)) {
          shuffledPlaylist.push(item);
        }
      });
      
      return shuffledPlaylist;
    }
    
    return loadedPlaylist;
  }, [CACHE_KEYS]);

  // Fetch playlist data from YouTube API
  const fetchPlaylistData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const apiKey = getApiKey();
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${apiKey}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch playlist: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }
      
      const playlistItems: PlaylistItem[] = data.items
        .filter((item: any) => item.snippet.resourceId.kind === 'youtube#video')
        .map((item: any, index: number) => ({
          id: `${index}`,
          title: item.snippet.title,
          videoId: item.snippet.resourceId.videoId,
          thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
          originalIndex: index,
        }));
      
      setOriginalPlaylist(playlistItems);
      
      // Apply cached shuffle if it was enabled
      const finalPlaylist = applyCachedShuffle(playlistItems);
      setPlaylist(finalPlaylist);
      
      // Find and set the last played track
      const cachedVideoId = getFromCache(CACHE_KEYS.lastVideoId);
      if (cachedVideoId) {
        const cachedTrackIndex = findTrackByVideoId(cachedVideoId, finalPlaylist);
        if (cachedTrackIndex !== -1) {
          setCurrentTrack(cachedTrackIndex);
          console.log(`Resumed from cached track: ${finalPlaylist[cachedTrackIndex].title}`);
        }
      }
      
      console.log(`Loaded ${playlistItems.length} videos from playlist`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load playlist';
      setError(errorMessage);
      console.error('Error fetching playlist:', err);
    } finally {
      setIsLoading(false);
    }
  }, [playlistId, CACHE_KEYS, findTrackByVideoId, applyCachedShuffle]);

  // Load playlist data on mount and restore cached preferences
  useEffect(() => {
    if (playlistId) {
      loadCachedPreferences();
      fetchPlaylistData();
    }
  }, [fetchPlaylistData, loadCachedPreferences]);

  // Save current track whenever it changes
  useEffect(() => {
    if (playlist.length > 0) {
      saveCurrentTrack();
    }
  }, [currentTrack, playlist, saveCurrentTrack]);

  // Load YouTube API
  useEffect(() => {
    const loadYouTubeAPI = () => {
      if (typeof window !== 'undefined' && !window.YT && !isInitialized.current) {
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;
        document.head.appendChild(script);
        
        window.onYouTubeIframeAPIReady = () => {
          initializePlayer();
        };
        isInitialized.current = true;
      } else if (window.YT && window.YT.Player && playlist.length > 0) {
        initializePlayer();
      }
    };

    const initializePlayer = () => {
      if (playlist.length > 0 && !playerRef.current) {
        // Create hidden container
        const container = document.createElement('div');
        container.id = 'hidden-youtube-player';
        container.style.position = 'absolute';
        container.style.top = '-9999px';
        container.style.left = '-9999px';
        container.style.width = '1px';
        container.style.height = '1px';
        container.style.opacity = '0';
        container.style.pointerEvents = 'none';
        document.body.appendChild(container);

        playerRef.current = new window.YT.Player('hidden-youtube-player', {
          height: '1',
          width: '1',
          videoId: playlist[currentTrack]?.videoId,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            showinfo: 0,
            start: 0,
            wmode: 'opaque',
          },
          events: {
            onReady: (event: any) => {
              console.log('YouTube player ready');
              // Load cached volume or default to 50
              const cachedVolume = getFromCache(CACHE_KEYS.volume) || 50;
              event.target.setVolume(cachedVolume);
            },
            onStateChange: (event: any) => {
              if (event.data === window.YT.PlayerState.ENDED) {
                handleNext();
              } else if (event.data === window.YT.PlayerState.PLAYING) {
                setIsPlaying(true);
              } else if (event.data === window.YT.PlayerState.PAUSED) {
                setIsPlaying(false);
              }
            },
            onError: (event: any) => {
              console.log('YouTube player error:', event.data);
              // Skip to next track on error
              handleNext();
            }
          },
        });
      }
    };

    if (playlist.length > 0) {
      loadYouTubeAPI();
    }

    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
      }
    };
  }, [playlist, currentTrack, CACHE_KEYS.volume]);

  const togglePlay = useCallback(() => {
    if (playerRef.current && playerRef.current.getPlayerState) {
      try {
        if (isPlaying) {
          playerRef.current.pauseVideo();
        } else {
          playerRef.current.playVideo();
        }
      } catch (error) {
        console.log('Error toggling play:', error);
      }
    }
  }, [isPlaying]);

  const handleNext = useCallback(() => {
    if (playlist.length > 0 && playerRef.current) {
      const nextTrack = isRepeat ? currentTrack : (currentTrack + 1) % playlist.length;
      setCurrentTrack(nextTrack);
      try {
        playerRef.current.loadVideoById({
          videoId: playlist[nextTrack].videoId,
          startSeconds: 0,
        });
        if (isPlaying) {
          setTimeout(() => {
            playerRef.current?.playVideo();
          }, 1000);
        }
      } catch (error) {
        console.log('Error loading next track:', error);
      }
    }
  }, [currentTrack, playlist, isRepeat, isPlaying]);

  const handlePrevious = useCallback(() => {
    if (playlist.length > 0 && playerRef.current) {
      const prevTrack = currentTrack === 0 ? playlist.length - 1 : currentTrack - 1;
      setCurrentTrack(prevTrack);
      try {
        playerRef.current.loadVideoById({
          videoId: playlist[prevTrack].videoId,
          startSeconds: 0,
        });
        if (isPlaying) {
          setTimeout(() => {
            playerRef.current?.playVideo();
          }, 1000);
        }
      } catch (error) {
        console.log('Error loading previous track:', error);
      }
    }
  }, [currentTrack, playlist, isPlaying]);

  const setVolume = useCallback((volume: number) => {
    if (playerRef.current && playerRef.current.setVolume) {
      try {
        const clampedVolume = Math.max(0, Math.min(100, volume));
        playerRef.current.setVolume(clampedVolume);
        // Cache the volume setting
        saveToCache(CACHE_KEYS.volume, clampedVolume);
      } catch (error) {
        console.log('Error setting volume:', error);
      }
    }
  }, [CACHE_KEYS.volume]);

  // Toggle repeat and cache preference
  const toggleRepeat = useCallback(() => {
    const newRepeat = !isRepeat;
    setIsRepeat(newRepeat);
    saveToCache(CACHE_KEYS.isRepeat, newRepeat);
  }, [isRepeat, CACHE_KEYS.isRepeat]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey) {
        switch (event.code) {
          case 'KeyV':
            event.preventDefault();
            togglePlay();
            break;
          case 'ArrowRight':
            event.preventDefault();
            handleNext();
            break;
          case 'ArrowLeft':
            event.preventDefault();
            handlePrevious();
            break;
          case 'KeyR':
            event.preventDefault();
            toggleRepeat();
            break;
          case 'KeyS':
            event.preventDefault();
            toggleShuffle();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, handleNext, handlePrevious, toggleRepeat, toggleShuffle]);

  // Clear cache function for debugging/reset
  const clearCache = useCallback(() => {
    Object.values(CACHE_KEYS).forEach(key => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key);
      }
    });
    console.log('Playlist cache cleared');
  }, [CACHE_KEYS]);

  // Return status information (optional - can be used for debugging)
  const getStatus = () => ({
    isLoading,
    error,
    playlistLength: playlist.length,
    currentTrack,
    currentTitle: playlist[currentTrack]?.title || '',
    isPlaying,
    isRepeat,
    isShuffled,
    cachedVideoId: getFromCache(CACHE_KEYS.lastVideoId),
  });

  // Expose methods for external control
  useEffect(() => {
    // Make methods available globally for external control
    (window as any).youtubePlayer = {
      play: togglePlay,
      next: handleNext,
      previous: handlePrevious,
      setVolume,
      toggleRepeat,
      toggleShuffle,
      getStatus,
      reload: fetchPlaylistData,
      clearCache, // Added for debugging/reset
    };

    return () => {
      delete (window as any).youtubePlayer;
    };
  }, [togglePlay, handleNext, handlePrevious, setVolume, toggleRepeat, toggleShuffle, getStatus, fetchPlaylistData, clearCache]);

  // This component renders nothing visible by default
  // You can uncomment the JSX below to add a simple control interface
  
  /*
  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '20px', 
      right: '20px', 
      background: 'rgba(0,0,0,0.8)', 
      color: 'white', 
      padding: '10px', 
      borderRadius: '5px',
      zIndex: 9999 
    }}>
      {isLoading && <div>Loading playlist...</div>}
      {error && <div style={{ color: '#ff6b6b' }}>Error: {error}</div>}
      {playlist.length > 0 && (
        <div>
          <div>{playlist[currentTrack]?.title}</div>
          <div style={{ marginTop: '5px' }}>
            <button onClick={handlePrevious}>⏮</button>
            <button onClick={togglePlay}>{isPlaying ? '⏸' : '▶'}</button>
            <button onClick={handleNext}>⏭</button>
            <button onClick={toggleRepeat}>{isRepeat ? '🔁' : '🔄'}</button>
            <button onClick={toggleShuffle}>{isShuffled ? '🔀' : '📋'}</button>
          </div>
          <div style={{ fontSize: '12px', marginTop: '5px' }}>
            {currentTrack + 1} / {playlist.length} {isShuffled ? '(Shuffled)' : ''}
          </div>
        </div>
      )}
    </div>
  );
  */
  
  return null;
};

// Add YouTube API types to window
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
    youtubePlayer?: {
      play: () => void;
      next: () => void;
      previous: () => void;
      setVolume: (volume: number) => void;
      toggleRepeat: () => void;
      toggleShuffle: () => void;
      getStatus: () => any;
      reload: () => void;
      clearCache: () => void;
    };
  }
}

export default YouTubePlaylistStreamer;
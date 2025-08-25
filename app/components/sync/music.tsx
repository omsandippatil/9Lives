"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface PlaylistItem {
  id: string;
  title: string;
  videoId: string;
  thumbnail?: string;
  originalIndex?: number;
}

interface YouTubePlaylistStreamerProps {
  playlistId: string;
}

// Singleton manager to prevent multiple instances
class YouTubePlayerManager {
  private static instance: YouTubePlayerManager | null = null;
  private player: any = null;
  private isInitialized = false;
  private currentPlaylistId = '';
  private callbacks: Set<() => void> = new Set();
  private playlist: PlaylistItem[] = [];
  private originalPlaylist: PlaylistItem[] = [];
  private currentTrack = 0;
  private isPlaying = false;
  private isRepeat = false;
  private isShuffled = false;
  private isLoading = false;
  private error: string | null = null;
  private fetchPromise: Promise<void> | null = null;

  // In-memory state
  private state = {
    lastVideoId: '',
    isShuffled: false,
    isRepeat: false,
    shuffledOrder: [] as string[],
    volume: 50
  };

  static getInstance(): YouTubePlayerManager {
    if (!YouTubePlayerManager.instance) {
      YouTubePlayerManager.instance = new YouTubePlayerManager();
    }
    return YouTubePlayerManager.instance;
  }

  private constructor() {
    // Private constructor for singleton
  }

  subscribe(callback: () => void) {
    this.callbacks.add(callback);
    return () => {
      this.callbacks.delete(callback);
    };
  }

  private notify() {
    this.callbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in subscriber callback:', error);
      }
    });
  }

  getState() {
    return {
      playlist: this.playlist,
      originalPlaylist: this.originalPlaylist,
      currentTrack: this.currentTrack,
      isPlaying: this.isPlaying,
      isRepeat: this.isRepeat,
      isShuffled: this.isShuffled,
      isLoading: this.isLoading,
      error: this.error,
      currentTitle: this.playlist[this.currentTrack]?.title || '',
      playlistLength: this.playlist.length
    };
  }

  async initialize(playlistId: string) {
    // Prevent multiple initializations for the same playlist
    if (this.currentPlaylistId === playlistId && this.playlist.length > 0) {
      return;
    }

    // If already loading this playlist, wait for it
    if (this.fetchPromise && this.currentPlaylistId === playlistId) {
      await this.fetchPromise;
      return;
    }

    this.currentPlaylistId = playlistId;
    this.fetchPromise = this.loadPlaylist(playlistId);
    await this.fetchPromise;
    this.fetchPromise = null;
  }

  private async loadPlaylist(playlistId: string) {
    this.isLoading = true;
    this.error = null;
    this.notify();

    try {
      const response = await fetch(`/api/youtube-playlist?playlistId=${encodeURIComponent(playlistId)}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch playlist: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      if (!data.items || !Array.isArray(data.items)) {
        throw new Error('Invalid playlist data received');
      }
      
      const playlistItems: PlaylistItem[] = data.items
        .filter((item: any) => item?.videoId && item?.title)
        .map((item: any, index: number) => ({
          id: `${index}`,
          title: item.title,
          videoId: item.videoId,
          thumbnail: item.thumbnail,
          originalIndex: index,
        }));

      if (playlistItems.length === 0) {
        throw new Error('No valid videos found in playlist');
      }
      
      this.originalPlaylist = playlistItems;
      this.playlist = [...playlistItems];
      
      // Find cached track
      if (this.state.lastVideoId) {
        const cachedIndex = this.playlist.findIndex(item => item.videoId === this.state.lastVideoId);
        if (cachedIndex !== -1) {
          this.currentTrack = cachedIndex;
        }
      }

      await this.initializeYouTubePlayer();
      
      console.log(`Loaded ${playlistItems.length} videos from playlist`);
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to load playlist';
      console.error('Error fetching playlist:', err);
    } finally {
      this.isLoading = false;
      this.notify();
    }
  }

  private async initializeYouTubePlayer() {
    if (this.isInitialized && this.player) {
      // Update existing player with new video
      this.loadCurrentTrack();
      return;
    }

    return new Promise<void>((resolve) => {
      const loadAPI = () => {
        if (typeof window === 'undefined') {
          resolve();
          return;
        }

        if (!window.YT && !this.isInitialized) {
          const script = document.createElement('script');
          script.src = 'https://www.youtube.com/iframe_api';
          script.async = true;
          document.head.appendChild(script);
          
          window.onYouTubeIframeAPIReady = () => {
            this.createPlayer();
            resolve();
          };
        } else if (window.YT && window.YT.Player) {
          this.createPlayer();
          resolve();
        } else {
          // API is loading, wait a bit and try again
          setTimeout(() => loadAPI(), 100);
        }
      };

      loadAPI();
    });
  }

  private createPlayer() {
    if (this.player || this.playlist.length === 0) return;

    // Ensure container exists and is unique
    let container = document.getElementById('singleton-youtube-player');
    if (!container) {
      container = document.createElement('div');
      container.id = 'singleton-youtube-player';
      container.style.position = 'absolute';
      container.style.top = '-9999px';
      container.style.left = '-9999px';
      container.style.width = '1px';
      container.style.height = '1px';
      container.style.opacity = '0';
      container.style.pointerEvents = 'none';
      document.body.appendChild(container);
    }

    try {
      this.player = new window.YT.Player('singleton-youtube-player', {
        height: '1',
        width: '1',
        videoId: this.playlist[this.currentTrack]?.videoId || this.playlist[0]?.videoId,
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
            console.log('Singleton YouTube player ready');
            event.target.setVolume(this.state.volume);
            this.isInitialized = true;
            this.notify();
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              this.next();
            } else if (event.data === window.YT.PlayerState.PLAYING) {
              this.isPlaying = true;
              this.notify();
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              this.isPlaying = false;
              this.notify();
            }
          },
          onError: (event: any) => {
            console.log('YouTube player error:', event.data);
            this.next();
          }
        },
      });
    } catch (error) {
      console.error('Failed to create YouTube player:', error);
    }
  }

  private loadCurrentTrack() {
    if (this.player && this.playlist[this.currentTrack]) {
      try {
        this.player.loadVideoById({
          videoId: this.playlist[this.currentTrack].videoId,
          startSeconds: 0,
        });
        this.state.lastVideoId = this.playlist[this.currentTrack].videoId;
      } catch (error) {
        console.log('Error loading track:', error);
      }
    }
  }

  togglePlay() {
    if (this.player && this.player.getPlayerState) {
      try {
        if (this.isPlaying) {
          this.player.pauseVideo();
        } else {
          this.player.playVideo();
        }
      } catch (error) {
        console.log('Error toggling play:', error);
      }
    }
  }

  next() {
    if (this.playlist.length === 0) return;
    
    const nextTrack = this.isRepeat ? this.currentTrack : (this.currentTrack + 1) % this.playlist.length;
    this.currentTrack = nextTrack;
    this.loadCurrentTrack();
    
    if (this.isPlaying) {
      setTimeout(() => {
        this.player?.playVideo();
      }, 1000);
    }
    
    this.notify();
  }

  previous() {
    if (this.playlist.length === 0) return;
    
    const prevTrack = this.currentTrack === 0 ? this.playlist.length - 1 : this.currentTrack - 1;
    this.currentTrack = prevTrack;
    this.loadCurrentTrack();
    
    if (this.isPlaying) {
      setTimeout(() => {
        this.player?.playVideo();
      }, 1000);
    }
    
    this.notify();
  }

  setVolume(volume: number) {
    if (this.player && this.player.setVolume) {
      try {
        const clampedVolume = Math.max(0, Math.min(100, volume));
        this.player.setVolume(clampedVolume);
        this.state.volume = clampedVolume;
      } catch (error) {
        console.log('Error setting volume:', error);
      }
    }
  }

  toggleRepeat() {
    this.isRepeat = !this.isRepeat;
    this.state.isRepeat = this.isRepeat;
    this.notify();
  }

  toggleShuffle() {
    // Implementation similar to original but adapted for singleton
    if (!this.isShuffled) {
      const currentVideoId = this.playlist[this.currentTrack]?.videoId;
      const shuffled = [...this.originalPlaylist];
      
      // Simple shuffle
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      
      const newCurrentIndex = shuffled.findIndex(item => item.videoId === currentVideoId);
      
      this.playlist = shuffled;
      this.currentTrack = newCurrentIndex !== -1 ? newCurrentIndex : 0;
      this.isShuffled = true;
      this.state.isShuffled = true;
    } else {
      const currentVideoId = this.playlist[this.currentTrack]?.videoId;
      const originalIndex = this.originalPlaylist.findIndex(item => item.videoId === currentVideoId);
      
      this.playlist = [...this.originalPlaylist];
      this.currentTrack = originalIndex !== -1 ? originalIndex : 0;
      this.isShuffled = false;
      this.state.isShuffled = false;
    }
    
    this.notify();
  }

  destroy() {
    if (this.player && this.player.destroy) {
      try {
        this.player.destroy();
      } catch (error) {
        console.log('Error destroying player:', error);
      }
    }
    
    const container = document.getElementById('singleton-youtube-player');
    if (container) {
      container.remove();
    }
    
    this.player = null;
    this.isInitialized = false;
    this.callbacks.clear();
    YouTubePlayerManager.instance = null;
  }
}

const YouTubePlaylistStreamer: React.FC<YouTubePlaylistStreamerProps> = ({ 
  playlistId
}) => {
  const [, forceUpdate] = useState({});
  const managerRef = useRef<YouTubePlayerManager>();

  // Force re-render when manager state changes
  const triggerUpdate = useCallback(() => {
    forceUpdate({});
  }, []);

  useEffect(() => {
    managerRef.current = YouTubePlayerManager.getInstance();
    const unsubscribe = managerRef.current.subscribe(triggerUpdate);

    // Initialize with the playlist
    managerRef.current.initialize(playlistId);

    return unsubscribe;
  }, [playlistId, triggerUpdate]);

  useEffect(() => {
    const manager = managerRef.current;
    if (!manager) return;

    // Expose global controls
    (window as any).youtubePlayer = {
      play: () => manager.togglePlay(),
      next: () => manager.next(),
      previous: () => manager.previous(),
      setVolume: (volume: number) => manager.setVolume(volume),
      toggleRepeat: () => manager.toggleRepeat(),
      toggleShuffle: () => manager.toggleShuffle(),
      getStatus: () => manager.getState(),
      reload: () => manager.initialize(playlistId),
      clearCache: () => {
        manager.destroy();
        managerRef.current = YouTubePlayerManager.getInstance();
      },
    };

    return () => {
      delete (window as any).youtubePlayer;
    };
  }, [playlistId]);

  // Keyboard shortcuts
  useEffect(() => {
    const manager = managerRef.current;
    if (!manager) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey) {
        switch (event.code) {
          case 'KeyV':
            event.preventDefault();
            manager.togglePlay();
            break;
          case 'ArrowRight':
            event.preventDefault();
            manager.next();
            break;
          case 'ArrowLeft':
            event.preventDefault();
            manager.previous();
            break;
          case 'KeyR':
            event.preventDefault();
            manager.toggleRepeat();
            break;
          case 'KeyS':
            event.preventDefault();
            manager.toggleShuffle();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // This component renders nothing visible
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
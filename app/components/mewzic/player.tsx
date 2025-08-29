import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Loader, AlertTriangle } from 'lucide-react';

interface Song {
  id: number;
  emoji: string;
  name: string;
  vibe: string;
  genre: string;
  language: string;
  singers: string;
  playlist: string;
  youtube: {
    url: string;
    videoId: string;
    embedUrl: string;
  };
  plays: number;
}

interface MusicPlayerProps {
  currentSongId: number | null;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  playPauseToggle?: number;
}

// YouTube Player API interface
interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  getPlayerState: () => number;
  addEventListener: (event: string, listener: (event: any) => void) => void;
  removeEventListener: (event: string, listener: (event: any) => void) => void;
  destroy: () => void;
}

declare global {
  interface Window {
    YT: {
      Player: new (elementId: string, config: any) => YTPlayer;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
      };
      ready: (callback: () => void) => void;
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ 
  currentSongId, 
  onPlayPause, 
  onNext, 
  onPrev,
  playPauseToggle 
}) => {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [ytApiReady, setYtApiReady] = useState(false);

  const playerRef = useRef<YTPlayer | null>(null);
  const playerElementRef = useRef<string>(`yt-player-${Date.now()}`);
  const previousPlayPauseToggle = useRef<number>(0);

  // Load YouTube API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setYtApiReady(true);
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      setYtApiReady(true);
    };

    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (error) {
          console.log('Error destroying YouTube player:', error);
        }
      }
    };
  }, []);

  // Handle play/pause toggle from external control (Alt+V)
  useEffect(() => {
    if (playPauseToggle && playPauseToggle !== previousPlayPauseToggle.current) {
      previousPlayPauseToggle.current = playPauseToggle;
      handlePlayPause();
    }
  }, [playPauseToggle]);

  // Load song data
  useEffect(() => {
    if (currentSongId === null) {
      setCurrentSong(null);
      setIsPlaying(false);
      setHasError(false);
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
          playerRef.current = null;
        } catch (error) {
          console.log('Error destroying player:', error);
        }
      }
      return;
    }

    const fetchSong = async () => {
      setIsLoading(true);
      setHasError(false);
      setErrorMessage('');
      
      try {
        console.log('Fetching song ID:', currentSongId);
        
        const response = await fetch(`/api/get/mewzic/song?id=${currentSongId}`);
        
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`API Error: ${response.status} - ${text}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          throw new Error('API returned non-JSON response');
        }

        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }

        if (!data.success) {
          throw new Error('API response indicates failure');
        }

        setCurrentSong(data);
        
      } catch (error) {
        console.error('Failed to load song:', error);
        setHasError(true);
        setErrorMessage(error instanceof Error ? error.message : 'Failed to load song');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSong();
  }, [currentSongId]);

  // Initialize YouTube player when song changes and API is ready
  useEffect(() => {
    if (!currentSong || !ytApiReady || hasError) return;

    const initializePlayer = () => {
      // Destroy existing player
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (error) {
          console.log('Error destroying previous player:', error);
        }
      }

      // Create new player
      try {
        playerRef.current = new window.YT.Player(playerElementRef.current, {
          height: '0',
          width: '0',
          videoId: currentSong.youtube.videoId,
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            modestbranding: 1,
            rel: 0,
            showinfo: 0,
          },
          events: {
            onReady: (event: any) => {
              console.log('YouTube player ready');
              setIsPlaying(true);
              event.target.playVideo();
            },
            onStateChange: (event: any) => {
              const state = event.data;
              console.log('YouTube player state changed:', state);
              
              if (state === window.YT.PlayerState.PLAYING) {
                setIsPlaying(true);
              } else if (state === window.YT.PlayerState.PAUSED) {
                setIsPlaying(false);
              } else if (state === window.YT.PlayerState.ENDED) {
                setIsPlaying(false);
                // Auto-play next song when current song ends
                console.log('Song ended, playing next song');
                onNext();
              }
            },
            onError: (event: any) => {
              console.error('YouTube player error:', event.data);
              setHasError(true);
              setErrorMessage('Failed to load video');
              setIsPlaying(false);
            }
          }
        });
      } catch (error) {
        console.error('Error creating YouTube player:', error);
        setHasError(true);
        setErrorMessage('Failed to initialize player');
      }
    };

    if (window.YT && window.YT.ready) {
      window.YT.ready(initializePlayer);
    } else {
      initializePlayer();
    }

    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch (error) {
          console.log('Error in cleanup:', error);
        }
      }
    };
  }, [currentSong, ytApiReady, hasError]);

  const handlePlayPause = () => {
    if (!playerRef.current || hasError) return;

    try {
      if (isPlaying) {
        playerRef.current.pauseVideo();
      } else {
        playerRef.current.playVideo();
      }
    } catch (error) {
      console.error('Error controlling playback:', error);
    }
  };

  const handleNext = () => {
    setIsPlaying(false);
    onNext();
  };

  const handlePrev = () => {
    setIsPlaying(false);
    onPrev();
  };

  if (!currentSong) {
    return (
      <div className="h-20 bg-white border-t border-black flex items-center justify-center">
        <div className="text-gray-500">Select a song to start playing</div>
      </div>
    );
  }

  return (
    <div className="bg-white border-t border-black">
      {/* Error Display */}
      {hasError && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <div className="text-sm text-red-700">{errorMessage}</div>
          </div>
        </div>
      )}

      {/* Hidden YouTube Player Container */}
      <div className="hidden">
        <div id={playerElementRef.current}></div>
      </div>

      {/* Main Player */}
      <div className="h-20 flex items-center px-4">
        {/* Song Info */}
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className="w-12 h-12 border border-black flex items-center justify-center text-lg flex-shrink-0">
            {isLoading ? (
              <Loader className="h-5 w-5 animate-spin" />
            ) : hasError ? (
              <AlertTriangle className="h-5 w-5 text-red-500" />
            ) : (
              currentSong.emoji
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-black text-sm truncate">
              {currentSong.name}
            </div>
            <div className="text-xs text-gray-600 truncate">
              {currentSong.singers}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {currentSong.genre} • {currentSong.language} • {currentSong.plays} plays
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-2">
          <button 
            onClick={handlePrev} 
            className="p-1 hover:bg-gray-100 transition-colors"
            title="Previous song"
          >
            <SkipBack className="h-5 w-5 text-black" />
          </button>
          
          <button 
            onClick={handlePlayPause} 
            className="p-2 border border-black hover:bg-gray-100 transition-colors disabled:opacity-50"
            title={isPlaying ? "Pause" : "Play"}
            disabled={isLoading || hasError || !ytApiReady}
          >
            {isLoading || !ytApiReady ? (
              <Loader className="h-5 w-5 animate-spin" />
            ) : isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </button>
          
          <button 
            onClick={handleNext} 
            className="p-1 hover:bg-gray-100 transition-colors"
            title="Next song"
          >
            <SkipForward className="h-5 w-5 text-black" />
          </button>
        </div>

        {/* Song Details */}
        <div className="flex items-center space-x-3 flex-shrink-0 ml-4">
          <div className="text-xs text-gray-500">
            <span className="font-medium">{currentSong.vibe}</span>
            {currentSong.playlist && (
              <span className="ml-2">• {currentSong.playlist}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MusicPlayer;
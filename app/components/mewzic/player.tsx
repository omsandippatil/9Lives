import React, { useState, useEffect } from 'react';
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
}

const MusicPlayer: React.FC<MusicPlayerProps> = ({ 
  currentSongId, 
  onPlayPause, 
  onNext, 
  onPrev 
}) => {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Load song data
  useEffect(() => {
    if (currentSongId === null) {
      setCurrentSong(null);
      setIsPlaying(false);
      setHasError(false);
      return;
    }

    const fetchSong = async () => {
      setIsLoading(true);
      setHasError(false);
      setErrorMessage('');
      
      try {
        console.log('Fetching song ID:', currentSongId);
        
        const response = await fetch(`/api/get/mewzic/song?id=${currentSongId}`);
        
        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers.get('content-type'));
        
        if (!response.ok) {
          const text = await response.text();
          console.log('Error response body:', text);
          throw new Error(`API Error: ${response.status} - ${text}`);
        }

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const text = await response.text();
          console.log('Non-JSON response:', text);
          throw new Error('API returned non-JSON response');
        }

        const data = await response.json();
        console.log('Parsed data:', data);
        
        if (data.error) {
          throw new Error(data.error);
        }

        if (!data.success) {
          throw new Error('API response indicates failure');
        }

        setCurrentSong(data);
        setIsPlaying(true); // Auto-play when song loads
        
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

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    onPlayPause();
  };

  const handleNext = () => {
    setIsPlaying(false);
    onNext();
  };

  const handlePrev = () => {
    setIsPlaying(false);
    onPrev();
  };

  // Format time display
  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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

      {/* Hidden YouTube Player */}
      {currentSong && isPlaying && !hasError && (
        <div className="hidden">
          <iframe
            src={currentSong.youtube.embedUrl}
            width="0"
            height="0"
            allow="autoplay; encrypted-media"
            allowFullScreen
            title={currentSong.name}
          />
        </div>
      )}

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
            disabled={isLoading || hasError}
          >
            {isLoading ? (
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
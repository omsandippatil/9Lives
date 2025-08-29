"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import SearchBar from './search';
import MusicSections from './sections';
import MusicPlayer from './player';

interface Song {
  id: number;
  emoji: string;
  name: string;
  vibe: string;
  genre: string;
  language: string;
  singers: string;
  playlist: string;
  youtube: string;
  plays: number;
}

interface SectionData {
  tags: string[];
  songs: Song[];
}

interface Sections {
  [key: string]: SectionData;
}

interface SelectedTags {
  [key: string]: string[];
}

interface OptionsData {
  vibe: string[];
  genre: string[];
  language: string[];
  singers: string[];
}

interface AppState {
  sections: Sections;
  allSongs: Song[];
  options: OptionsData;
  selectedTags: SelectedTags;
  lastFetchTime: number;
  isDataLoaded: boolean;
}

interface SearchState {
  query: string;
  isSearching: boolean;
  searchResults: Song[];
  totalResults: number;
  hasMore: boolean;
  currentOffset: number;
}

// Cache duration - 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;
const STORAGE_KEY = 'mewzic-app-state';
const SONG_ID_KEY = 'mewzic-current-song-id';
const SEARCH_CACHE_KEY = 'mewzic-search-cache';
const SEARCH_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes for search cache

const Mewzic: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sections, setSections] = useState<Sections>({});
  const [selectedTags, setSelectedTags] = useState<SelectedTags>({});
  const [currentSongId, setCurrentSongId] = useState<number | null>(null);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [options, setOptions] = useState<OptionsData>({
    vibe: [],
    genre: [],
    language: [],
    singers: []
  });
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Search state
  const [searchState, setSearchState] = useState<SearchState>({
    query: '',
    isSearching: false,
    searchResults: [],
    totalResults: 0,
    hasMore: false,
    currentOffset: 0
  });
  
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const twoFingerStartY = useRef<number[]>([]);
  const twoFingerEndY = useRef<number[]>([]);
  const playPauseToggleRef = useRef<number>(0);

  // Load cached data and song ID on component mount
  useEffect(() => {
    const loadCachedData = () => {
      try {
        // Load current song ID
        const cachedSongId = localStorage.getItem(SONG_ID_KEY);
        if (cachedSongId) {
          setCurrentSongId(parseInt(cachedSongId, 10));
        }

        // Load app state
        const cachedState = localStorage.getItem(STORAGE_KEY);
        if (cachedState) {
          const parsedState: AppState = JSON.parse(cachedState);
          const now = Date.now();
          
          // Check if cached data is still valid
          if (now - parsedState.lastFetchTime < CACHE_DURATION && parsedState.isDataLoaded) {
            setSections(parsedState.sections);
            setAllSongs(parsedState.allSongs);
            setOptions(parsedState.options);
            setSelectedTags(parsedState.selectedTags);
            setIsDataLoaded(true);
            console.log('Loaded data from cache');
            return true;
          }
        }
      } catch (error) {
        console.error('Error loading cached data:', error);
      }
      return false;
    };

    const hasCachedData = loadCachedData();
    if (!hasCachedData && !isDataLoaded) {
      fetchInitialData();
    }

    // Clear search state on component mount to prevent search persistence
    setSearchState({
      query: '',
      isSearching: false,
      searchResults: [],
      totalResults: 0,
      hasMore: false,
      currentOffset: 0
    });
    setSearchQuery('');
    setShowSearch(false);
  }, []);

  // Cache song ID whenever it changes
  useEffect(() => {
    if (currentSongId !== null) {
      localStorage.setItem(SONG_ID_KEY, currentSongId.toString());
    }
  }, [currentSongId]);

  // Cache app state whenever key data changes
  useEffect(() => {
    if (isDataLoaded && (sections || allSongs.length > 0 || Object.keys(options).some(key => options[key as keyof OptionsData].length > 0))) {
      const appState: AppState = {
        sections,
        allSongs,
        options,
        selectedTags,
        lastFetchTime: Date.now(),
        isDataLoaded: true
      };
      
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
      } catch (error) {
        console.error('Error caching app state:', error);
      }
    }
  }, [sections, allSongs, options, selectedTags, isDataLoaded]);

  // Fetch initial data
  const fetchInitialData = useCallback(async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      console.log('Fetching fresh data from API');
      
      // First fetch options
      const optionsResponse = await fetch('/api/get/mewzic/options?details=vibe,genre,language,singers');
      const optionsData = await optionsResponse.json();

      if (optionsData.error) {
        console.error('Error fetching options:', optionsData.error);
        return;
      }

      const fetchedOptions: OptionsData = {
        vibe: optionsData.details?.vibe || [],
        genre: optionsData.details?.genre || [],
        language: optionsData.details?.language || [],
        singers: optionsData.details?.singers || []
      };
      setOptions(fetchedOptions);

      // Fetch songs for each section using a random value from options
      const sectionTypes = ['vibe', 'genre', 'language', 'singers'];
      const sectionsData: Sections = {};

      for (const sectionType of sectionTypes) {
        const availableOptions = fetchedOptions[sectionType as keyof OptionsData] || [];
        let songs: Song[] = [];
        
        if (availableOptions.length > 0) {
          const randomOption = availableOptions[Math.floor(Math.random() * availableOptions.length)];
          
          try {
            const songsResponse = await fetch(`/api/get/mewzic/library?${sectionType}=${encodeURIComponent(randomOption)}&limit=5`);
            const songsData = await songsResponse.json();
            songs = songsData.songs || [];
          } catch (error) {
            console.error(`Error fetching songs for ${sectionType} ${randomOption}:`, error);
          }
        }
        
        sectionsData[sectionType] = {
          tags: availableOptions,
          songs: songs
        };
      }

      setSections(sectionsData);

      // Fetch all songs for player navigation
      const allSongsResponse = await fetch('/api/get/mewzic/library?limit=100');
      const allSongsData = await allSongsResponse.json();
      setAllSongs(allSongsData.songs || []);
      
      setIsDataLoaded(true);
      console.log('Fresh data loaded successfully');

    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  // Enhanced search with caching and debouncing
  const performSearch = useCallback(async (query: string, offset: number = 0) => {
    if (!query.trim()) return;

    // Check cache first
    const cacheKey = `${query.toLowerCase()}-${offset}`;
    try {
      const cachedSearch = localStorage.getItem(`${SEARCH_CACHE_KEY}-${cacheKey}`);
      if (cachedSearch) {
        const { data, timestamp } = JSON.parse(cachedSearch);
        if (Date.now() - timestamp < SEARCH_CACHE_DURATION) {
          console.log('Using cached search results');
          return data;
        }
      }
    } catch (error) {
      console.error('Error loading search cache:', error);
    }

    try {
      setSearchState(prev => ({ ...prev, isSearching: true }));
      
      const response = await fetch(
        `/api/get/mewzic/search?q=${encodeURIComponent(query)}&limit=20&offset=${offset}&sort=plays&order=desc`
      );
      const data = await response.json();

      if (data.error) {
        console.error('Search API error:', data.error);
        return null;
      }

      // Cache the results
      try {
        localStorage.setItem(`${SEARCH_CACHE_KEY}-${cacheKey}`, JSON.stringify({
          data,
          timestamp: Date.now()
        }));
      } catch (error) {
        console.error('Error caching search results:', error);
      }

      return data;
    } catch (error) {
      console.error('Search error:', error);
      return null;
    } finally {
      setSearchState(prev => ({ ...prev, isSearching: false }));
    }
  }, []);

  // Debounced search handler
  const handleSearch = useCallback(async (query: string) => {
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim()) {
      // Reset to original sections when search is cleared
      setSearchState({
        query: '',
        isSearching: false,
        searchResults: [],
        totalResults: 0,
        hasMore: false,
        currentOffset: 0
      });

      // Reset to cached sections or fetch new random ones
      const sectionTypes = ['vibe', 'genre', 'language', 'singers'];
      const sectionsData: Sections = {};

      try {
        for (const sectionType of sectionTypes) {
          const availableOptions = options[sectionType as keyof OptionsData] || [];
          let songs: Song[] = [];
          
          if (availableOptions.length > 0) {
            const randomOption = availableOptions[Math.floor(Math.random() * availableOptions.length)];
            
            try {
              const songsResponse = await fetch(`/api/get/mewzic/library?${sectionType}=${encodeURIComponent(randomOption)}&limit=5`);
              const songsData = await songsResponse.json();
              songs = songsData.songs || [];
            } catch (error) {
              console.error(`Error fetching songs for ${sectionType} ${randomOption}:`, error);
            }
          }
          
          sectionsData[sectionType] = {
            tags: availableOptions,
            songs: songs
          };
        }

        setSections(sectionsData);
      } catch (error) {
        console.error('Error resetting sections:', error);
      }
      return;
    }

    // Set loading state immediately
    setSearchState(prev => ({ 
      ...prev, 
      query, 
      isSearching: true,
      currentOffset: 0
    }));

    // Debounce the actual search
    searchTimeoutRef.current = setTimeout(async () => {
      const searchData = await performSearch(query, 0);
      
      if (searchData) {
        const newSearchState: SearchState = {
          query,
          isSearching: false,
          searchResults: searchData.songs || [],
          totalResults: searchData.pagination?.total_results || 0,
          hasMore: searchData.pagination?.has_more || false,
          currentOffset: 0
        };
        
        setSearchState(newSearchState);

        // Update sections with search results
        setSections({
          search: {
            tags: [],
            songs: searchData.songs || []
          }
        });
      }
    }, 300); // 300ms debounce
  }, [options, performSearch]);

  // Keyboard shortcuts - Alt+P and Alt+V
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsVisible(!isVisible);
      } else if (e.altKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        handlePlayPause();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, currentSongId]);

  // Touch handling for mobile - only two finger gestures
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Two finger gesture
        twoFingerStartY.current = [e.touches[0].clientY, e.touches[1].clientY];
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // Two finger gesture
        twoFingerEndY.current = [e.touches[0].clientY, e.touches[1].clientY];
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (twoFingerStartY.current.length === 2 && twoFingerEndY.current.length === 2) {
        // Calculate average movement for two fingers
        const avgStartY = (twoFingerStartY.current[0] + twoFingerStartY.current[1]) / 2;
        const avgEndY = (twoFingerEndY.current[0] + twoFingerEndY.current[1]) / 2;
        const deltaY = avgStartY - avgEndY;
        
        if (Math.abs(deltaY) > 100) {
          if (deltaY > 0) { 
            // Two fingers swipe up - show component
            setIsVisible(true);
          } else if (deltaY < 0) { 
            // Two fingers swipe down - hide component
            setIsVisible(false);
          }
        }
        
        // Reset two finger tracking
        twoFingerStartY.current = [];
        twoFingerEndY.current = [];
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  const handleTagToggle = async (sectionType: string, tag: string) => {
    const currentTags = selectedTags[sectionType] || [];
    const newTags = currentTags.includes(tag) 
      ? currentTags.filter(t => t !== tag)
      : [tag];

    setSelectedTags({
      ...selectedTags,
      [sectionType]: newTags
    });

    if (newTags.length > 0) {
      try {
        const response = await fetch(`/api/get/mewzic/library?${sectionType}=${encodeURIComponent(tag)}&limit=20`);
        const data = await response.json();

        if (data.songs) {
          setSections(prev => ({
            ...prev,
            [sectionType]: {
              ...prev[sectionType],
              songs: data.songs
            }
          }));
        }
      } catch (error) {
        console.error('Filter error:', error);
      }
    }
  };

  const handleSongSelect = (song: Song) => {
    setCurrentSongId(song.id);
  };

  const handlePlayPause = () => {
    if (currentSongId !== null) {
      // Increment toggle counter to trigger play/pause in player component
      playPauseToggleRef.current += 1;
    } else {
      // Play random song if no song is selected
      if (allSongs.length > 0) {
        const randomSong = allSongs[Math.floor(Math.random() * allSongs.length)];
        setCurrentSongId(randomSong.id);
      }
    }
  };

  const handleNext = () => {
    const currentIndex = allSongs.findIndex(song => song.id === currentSongId);
    if (currentIndex !== -1 && currentIndex < allSongs.length - 1) {
      setCurrentSongId(allSongs[currentIndex + 1].id);
    } else if (allSongs.length > 0) {
      setCurrentSongId(allSongs[0].id);
    }
  };

  const handlePrev = () => {
    const currentIndex = allSongs.findIndex(song => song.id === currentSongId);
    if (currentIndex > 0) {
      setCurrentSongId(allSongs[currentIndex - 1].id);
    } else if (allSongs.length > 0) {
      setCurrentSongId(allSongs[allSongs.length - 1].id);
    }
  };

  // Single player instance that's always rendered
  const musicPlayer = (
    <MusicPlayer
      currentSongId={currentSongId}
      onPlayPause={handlePlayPause}
      onNext={handleNext}
      onPrev={handlePrev}
      playPauseToggle={playPauseToggleRef.current}
    />
  );

  // If not visible, render player in hidden container for background playback
  if (!isVisible) {
    return (
      <div className="fixed top-0 left-0 w-0 h-0 overflow-hidden pointer-events-none">
        {musicPlayer}
      </div>
    );
  }

  // Fullscreen overlay when visible
  return (
    <div className="fixed inset-0 z-50">
      {/* Fullscreen backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-80" />
      
      {/* Main Fullscreen Panel */}
      <div className="relative w-full h-full bg-white text-black font-mono flex flex-col animate-in fade-in zoom-in-95 duration-300">
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-4 border-b border-black bg-white flex-shrink-0 relative z-10">
          <div className="flex items-center">
            <span className="text-xl mr-2">🐱</span>
            <h1 className="text-xl text-black">Mewzic</h1>
            {(isLoading || searchState.isSearching) && (
              <div className="ml-3 text-sm text-gray-600">
                {isLoading ? 'Loading...' : 'Searching...'}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {showSearch && (
              <div className="w-64 animate-in slide-in-from-right-3 duration-300">
                <SearchBar 
                  onSearch={handleSearch}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  isSearching={searchState.isSearching}
                  searchResults={searchState.searchResults}
                  totalResults={searchState.totalResults}
                />
              </div>
            )}
            {showSearch ? (
              <button
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery('');
                  handleSearch('');
                }}
                className="p-2 hover:bg-gray-100 border border-black text-black transition-colors rounded"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => setShowSearch(true)}
                className="p-2 hover:bg-gray-100 border border-black text-black transition-colors rounded"
              >
                <Search className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => setIsVisible(false)}
              className="p-2 hover:bg-gray-100 text-black transition-colors font-bold"
              title="Close (Alt + P)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Sections - Scrollable content area */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          <MusicSections
            sections={sections}
            onSongSelect={handleSongSelect}
            selectedTags={selectedTags}
            onTagToggle={handleTagToggle}
          />
        </div>

        {/* Player - Fixed bottom */}
        <div className="flex-shrink-0 border-t border-black bg-white relative z-10">
          {musicPlayer}
        </div>
      </div>
    </div>
  );
};

export default Mewzic;
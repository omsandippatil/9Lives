import React, { useState, useRef } from 'react';
import { Search, Loader2, X } from 'lucide-react';

interface Song {
  id: number;
  emoji: string;
  name: string;
  singers: string;
  plays: number;
}

interface SearchBarProps {
  onSearch: (query: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearching?: boolean;
  searchResults?: Song[];
  totalResults?: number;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  onSearch, 
  searchQuery, 
  setSearchQuery,
  isSearching = false,
  totalResults = 0
}) => {
  const [localQuery, setLocalQuery] = useState(searchQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalQuery(value);
    setSearchQuery(value);
    // Only call onSearch when user explicitly searches, not on every keystroke
  };

  const handleSearch = () => {
    if (localQuery.trim()) {
      onSearch(localQuery.trim());
    }
  };

  const handleClear = () => {
    setLocalQuery('');
    setSearchQuery('');
    onSearch('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleClear();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  return (
    <div className="relative">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex">
          {isSearching ? (
            <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 animate-spin z-10" />
          ) : (
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 z-10" />
          )}
          
          <input
            ref={inputRef}
            type="text"
            placeholder="Search songs, artists, genres... (Press Enter)"
            value={localQuery}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="w-full pl-10 pr-20 py-2 border border-black bg-white text-black placeholder-gray-500 focus:outline-none focus:border-black focus:ring-1 focus:ring-black font-mono text-sm"
            disabled={isSearching}
          />

          <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
            {localQuery && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                disabled={isSearching}
                title="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
            
            <button
              type="submit"
              onClick={handleSearch}
              className="px-2 py-1 bg-black text-white text-xs hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSearching || !localQuery.trim()}
              title="Search"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>
      </form>

      {(searchQuery || isSearching) && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-black border-t-0 px-3 py-2 text-xs text-gray-600 font-mono z-20">
          {isSearching ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Searching for "{searchQuery}"...</span>
            </div>
          ) : searchQuery ? (
            <span>
              {totalResults > 0 ? (
                `Found ${totalResults.toLocaleString()} song${totalResults !== 1 ? 's' : ''} for "${searchQuery}"`
              ) : (
                `No results found for "${searchQuery}"`
              )}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
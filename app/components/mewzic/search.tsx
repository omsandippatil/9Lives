import React from 'react';
import { Search, Loader2 } from 'lucide-react';

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
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearch(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearch(searchQuery);
    } else if (e.key === 'Escape') {
      setSearchQuery('');
      onSearch('');
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        {isSearching ? (
          <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 animate-spin" />
        ) : (
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
        )}
        <input
          type="text"
          placeholder="Search songs, artists, genres..."
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className="w-full pl-10 pr-4 py-2 border border-black bg-white text-black placeholder-gray-500 focus:outline-none focus:border-black focus:ring-1 focus:ring-black font-mono text-sm"
          autoFocus
          disabled={isSearching}
        />
      </div>

      {searchQuery && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-black border-t-0 px-3 py-2 text-xs text-gray-600 font-mono">
          {isSearching ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Searching...</span>
            </div>
          ) : (
            <span>
              {totalResults > 0 ? (
                `Found ${totalResults.toLocaleString()} song${totalResults !== 1 ? 's' : ''}`
              ) : (
                'No results found'
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
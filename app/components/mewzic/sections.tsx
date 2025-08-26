import React, { useEffect, useRef } from 'react';

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

interface MusicSectionsProps {
  sections: Sections;
  onSongSelect: (song: Song) => void;
  selectedTags: SelectedTags;
  onTagToggle: (sectionType: string, tag: string) => void;
}

const MusicSections: React.FC<MusicSectionsProps> = ({ 
  sections, 
  onSongSelect, 
  selectedTags, 
  onTagToggle 
}) => {
  const tagContainerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const sectionTitles: { [key: string]: { title: string; emoji: string } } = {
    vibe: { title: 'Vibe', emoji: '✨' },
    genre: { title: 'Genre', emoji: '🎶' }, 
    singers: { title: 'Singers', emoji: '🎤' },
    language: { title: 'Language', emoji: '🌍' },
    search: { title: 'Search Results', emoji: '🔍' }
  };

  // Auto-scroll to selected tag
  useEffect(() => {
    Object.keys(selectedTags).forEach(sectionType => {
      const container = tagContainerRefs.current[sectionType];
      if (container && selectedTags[sectionType]?.length > 0) {
        const selectedTag = selectedTags[sectionType][0]; // Get first selected tag
        const tagButton = container.querySelector(`button[data-tag="${selectedTag}"]`) as HTMLElement;
        
        if (tagButton) {
          const containerRect = container.getBoundingClientRect();
          const tagRect = tagButton.getBoundingClientRect();
          const scrollLeft = tagButton.offsetLeft - container.offsetLeft - (containerRect.width / 2) + (tagRect.width / 2);
          
          container.scrollTo({
            left: scrollLeft,
            behavior: 'smooth'
          });
        }
      }
    });
  }, [selectedTags]);

  // Color palettes for tags
  const tagColorPairs = [
    {
      normal: 'bg-red-100 text-red-800 border-red-200 hover:bg-red-200',
      selected: 'bg-red-600 text-white border-red-600 hover:bg-red-700'
    },
    {
      normal: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200',
      selected: 'bg-orange-600 text-white border-orange-600 hover:bg-orange-700'
    },
    {
      normal: 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200',
      selected: 'bg-yellow-600 text-white border-yellow-600 hover:bg-yellow-700'
    },
    {
      normal: 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200',
      selected: 'bg-green-600 text-white border-green-600 hover:bg-green-700'
    },
    {
      normal: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200',
      selected: 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
    },
    {
      normal: 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200',
      selected: 'bg-purple-600 text-white border-purple-600 hover:bg-purple-700'
    },
    {
      normal: 'bg-pink-100 text-pink-800 border-pink-200 hover:bg-pink-200',
      selected: 'bg-pink-600 text-white border-pink-600 hover:bg-pink-700'
    },
    {
      normal: 'bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200',
      selected: 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
    },
    {
      normal: 'bg-teal-100 text-teal-800 border-teal-200 hover:bg-teal-200',
      selected: 'bg-teal-600 text-white border-teal-600 hover:bg-teal-700'
    },
    {
      normal: 'bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-200',
      selected: 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700'
    }
  ];

  const sectionOrder = ['vibe', 'genre', 'singers', 'language', 'search'];

  const handleSongClick = (song: Song) => {
    onSongSelect(song);
  };

  const handleTagClick = (sectionType: string, tag: string) => {
    onTagToggle(sectionType, tag);
  };

  const getTagColor = (index: number, isSelected: boolean) => {
    const colorPair = tagColorPairs[index % tagColorPairs.length];
    return isSelected ? colorPair.selected : colorPair.normal;
  };

  // Sort sections by defined order
  const sortedSections = Object.entries(sections).sort(([a], [b]) => {
    const indexA = sectionOrder.indexOf(a);
    const indexB = sectionOrder.indexOf(b);
    return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
  });

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 font-mono">
      {sortedSections.map(([sectionType, data]) => (
        <div key={sectionType} className="bg-white border border-gray-200 shadow-sm overflow-hidden">
          {/* Section Header */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <span className="text-2xl">{sectionTitles[sectionType]?.emoji}</span>
              <h3 className="text-xl font-bold text-gray-800 font-mono">
                {sectionTitles[sectionType]?.title || sectionType}
              </h3>
              
              {/* Tags - Right beside heading with hidden scroll */}
              {sectionType !== 'search' && data.tags && data.tags.length > 0 && (
                <div 
                  ref={(el) => {tagContainerRefs.current[sectionType] = el}}
                  className="flex gap-2 overflow-x-auto ml-4" 
                  style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                  <style jsx>{`
                    div::-webkit-scrollbar {
                      display: none;
                    }
                  `}</style>
                  {data.tags.map((tag, index) => {
                    const isSelected = selectedTags[sectionType]?.includes(tag) || false;
                    return (
                      <button
                        key={tag}
                        data-tag={tag}
                        onClick={() => handleTagClick(sectionType, tag)}
                        className={`px-3 py-1 text-xs font-medium border transition-all duration-300 whitespace-nowrap hover:scale-110 rounded-md font-mono ${getTagColor(index, isSelected)}`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Songs - Grid of Circles */}
          <div className="p-6">
            {data.songs && data.songs.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {data.songs.map(song => (
                  <div
                    key={song.id}
                    onClick={() => handleSongClick(song)}
                    className="group cursor-pointer transition-all duration-500 ease-out hover:scale-110 hover:-translate-y-2 flex flex-col items-center text-center"
                  >
                    {/* Circular Emoji Container */}
                    <div className="w-20 h-20 flex items-center justify-center text-3xl bg-white border-2 border-gray-200 group-hover:border-gray-400 group-hover:shadow-lg flex-shrink-0 mb-3 transition-all duration-500 ease-out rounded-full">
                      {song.emoji}
                    </div>
                    
                    {/* Song Info */}
                    <div className="w-full transform transition-all duration-500 ease-out group-hover:scale-105">
                      <div className="font-bold text-gray-900 text-sm mb-1 truncate font-mono">
                        {song.name}
                      </div>
                      <div className="text-gray-600 text-xs truncate font-mono">
                        {song.singers}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4 opacity-50">🎵</div>
                <div className="text-gray-500 font-semibold text-lg mb-2 font-mono">No songs found</div>
                <div className="text-gray-400 text-sm font-mono">
                  {sectionType !== 'search' 
                    ? 'Try selecting a different filter'
                    : 'Try a different search term'
                  }
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
      
      {/* Add some bottom padding for better scroll experience */}
      <div className="h-4"></div>
    </div>
  );
};

export default MusicSections;
'use client';

import { useState, useEffect } from 'react';

interface UserProfile {
  id: string
  email: string
  coding_questions_attempted: number
  technical_questions_attempted: number
  fundamental_questions_attempted: number
  aptitude_questions_attempted?: number
  tech_topics_covered: number
  current_streak: [string, number] | null
  total_points: number
  total_questions_attempted: number
  categories: {
    coding: number
    technical: number
    fundamental: number
    aptitude: number
  }
  progress: {
    tech_topics_covered: number
    current_streak: number
    total_points: number
  }
  created_at: string
  updated_at: string
}

interface DragCodeBlocksProps {
  question: string;
  pseudoCode: string[];
  approach: string;
  language: string;
  onNext: () => void;
}

const notionColors = [
  'bg-red-100 border-red-200 text-red-800 hover:bg-red-200',
  'bg-orange-100 border-orange-200 text-orange-800 hover:bg-orange-200',
  'bg-yellow-100 border-yellow-200 text-yellow-800 hover:bg-yellow-200',
  'bg-green-100 border-green-200 text-green-800 hover:bg-green-200',
  'bg-blue-100 border-blue-200 text-blue-800 hover:bg-blue-200',
  'bg-purple-100 border-purple-200 text-purple-800 hover:bg-purple-200',
  'bg-pink-100 border-pink-200 text-pink-800 hover:bg-pink-200',
  'bg-indigo-100 border-indigo-200 text-indigo-800 hover:bg-indigo-200',
  'bg-teal-100 border-teal-200 text-teal-800 hover:bg-teal-200',
];

const shuffleArray = (array: any[]) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const getRandomColors = (items: string[]) => {
  const colors: Record<string, string> = {};
  const shuffledColors = shuffleArray([...notionColors]);
  
  items.forEach((item, index) => {
    colors[item] = shuffledColors[index % shuffledColors.length];
  });
  
  return colors;
};

const getStreakDisplay = (currentStreak: [string, number] | null) => {
  if (!currentStreak) {
    return { number: 0, emoji: '🔥', className: 'text-gray-400', emojiClassName: 'grayscale' };
  }

  const [streakDate, streakDays] = currentStreak;
  const today = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD

  // Only show active streak (black text) if the streak date is today
  if (streakDate === today) {
    return { number: streakDays, emoji: '🔥', className: 'text-black', emojiClassName: '' };
  } else {
    // For any other date (yesterday, older, etc.), show gray
    return { number: streakDays, emoji: '🔥', className: 'text-gray-400', emojiClassName: 'grayscale' };
  }
};

export default function DragCodeBlocks({
  question,
  pseudoCode,
  approach,
  language,
  onNext
}: DragCodeBlocksProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [showError, setShowError] = useState(false);
  const [showCorrectSequence, setShowCorrectSequence] = useState(false);
  const [hasAttempted, setHasAttempted] = useState(false);

  const [draggedItems, setDraggedItems] = useState<string[]>([]);
  const [availableItems, setAvailableItems] = useState<string[]>([]);
  const [itemColors, setItemColors] = useState<Record<string, string>>({});
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<{item: string, index: number, isFromAvailable: boolean} | null>(null);
  
  // Touch handling
  const [touchItem, setTouchItem] = useState<{item: string, index: number, isFromAvailable: boolean} | null>(null);

  useEffect(() => {
    // Shuffle pseudoCode and assign random colors
    const shuffled = shuffleArray(pseudoCode);
    setAvailableItems(shuffled);
    
    // Assign random colors to each item
    const colors = getRandomColors(pseudoCode);
    setItemColors(colors);

    fetchProfile();
  }, [pseudoCode]);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.profile) {
          setProfile(data.profile);
        }
      } else {
        console.error('Failed to fetch profile');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setProfileLoading(false);
    }
  };

  // Click handler for sequence selection
  const handleItemClick = (item: string, index: number, isFromAvailable: boolean) => {
    if (isFromAvailable) {
      // Move from available to end of ordered list
      setAvailableItems(prev => prev.filter((_, i) => i !== index));
      setDraggedItems(prev => [...prev, item]);
    } else {
      // Move from ordered list back to available
      setDraggedItems(prev => prev.filter((_, i) => i !== index));
      setAvailableItems(prev => [...prev, item]);
    }
    
    // Clear any error state when user makes changes
    setShowError(false);
    setShowCorrectSequence(false);
  };

  const handleDragStart = (e: React.DragEvent, item: string, index: number, isFromAvailable: boolean) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ item, index, isFromAvailable }));
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetIndex?: number) => {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    const { item, index, isFromAvailable } = data;

    moveItem(item, index, isFromAvailable, targetIndex);
    setDraggedIndex(null);
  };

  // Touch handlers
  const handleTouchStart = (item: string, index: number, isFromAvailable: boolean) => {
    setTouchItem({ item, index, isFromAvailable });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
  };

  const handleTouchEnd = (e: React.TouchEvent, targetIndex?: number) => {
    if (!touchItem) return;
    
    const { item, index, isFromAvailable } = touchItem;
    moveItem(item, index, isFromAvailable, targetIndex);
    setTouchItem(null);
  };

  const moveItem = (item: string, index: number, isFromAvailable: boolean, targetIndex?: number) => {
    if (targetIndex !== undefined) {
      // Dropping in the ordered list
      if (isFromAvailable) {
        // Remove from available items
        setAvailableItems(prev => prev.filter((_, i) => i !== index));
        // Add to ordered list at specific position
        const newDraggedItems = [...draggedItems];
        newDraggedItems.splice(targetIndex, 0, item);
        setDraggedItems(newDraggedItems);
      } else {
        // Reordering within the ordered list
        const newDraggedItems = [...draggedItems];
        newDraggedItems.splice(index, 1);
        newDraggedItems.splice(targetIndex, 0, item);
        setDraggedItems(newDraggedItems);
      }
    } else {
      // Dropping back to available items
      if (!isFromAvailable) {
        setDraggedItems(prev => prev.filter((_, i) => i !== index));
        setAvailableItems(prev => [...prev, item]);
      }
    }
    
    // Clear any error state when user makes changes
    setShowError(false);
    setShowCorrectSequence(false);
  };

  const reset = () => {
    setDraggedItems([]);
    const shuffled = shuffleArray(pseudoCode);
    setAvailableItems(shuffled);
    // Reassign random colors on reset
    const colors = getRandomColors(pseudoCode);
    setItemColors(colors);
    setShowError(false);
    setShowCorrectSequence(false);
    setHasAttempted(false);
  };

  const isComplete = draggedItems.length === pseudoCode.length && 
                   availableItems.length === 0 && 
                   JSON.stringify(draggedItems) === JSON.stringify(pseudoCode);

  const handleNext = async () => {
    if (isLoading) return;
    
    // Check if there are still available blocks (incomplete sequence)
    if (availableItems.length > 0) {
      setShowError(true);
      setTimeout(() => setShowError(false), 3000);
      return;
    }

    // Check if sequence is correct
    if (JSON.stringify(draggedItems) !== JSON.stringify(pseudoCode)) {
      setShowError(true);
      setShowCorrectSequence(true);
      setHasAttempted(true); // Mark as attempted only if they got it wrong
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Only award points if this is their first successful attempt
      if (!hasAttempted) {
        const response = await fetch('/api/add/points', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ points: 1 }),
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          
          // Wait for 1 second before showing animation
          setTimeout(() => {
            // Update profile points based on the response
            if (data.new_total && profile) {
              setProfile(prev => prev ? {
                ...prev,
                total_points: data.new_total,
                progress: {
                  ...prev.progress,
                  total_points: data.new_total
                }
              } : null);
            } else if (profile) {
              // Fallback: increment by points awarded
              const pointsAwarded = data.points_awarded || 5;
              setProfile(prev => prev ? {
                ...prev,
                total_points: prev.total_points + pointsAwarded,
                progress: {
                  ...prev.progress,
                  total_points: prev.total_points + pointsAwarded
                }
              } : null);
            }
            
            setShowAnimation(true);
            
            // Hide animation after 2 seconds
            setTimeout(() => {
              setShowAnimation(false);
            }, 2000);
            
            // Call the original onNext after animation completes
            setTimeout(() => {
              onNext();
            }, 2500);
          }, 1000);
        } else {
          const errorData = await response.json();
          console.error('Failed to add points:', errorData);
          onNext(); // Still proceed even if API fails
        }
      } else {
        // No points awarded for subsequent attempts, just proceed
        setTimeout(() => {
          onNext();
        }, 500);
      }
    } catch (error) {
      console.error('Error adding points:', error);
      onNext(); // Still proceed even if API fails
    } finally {
      setIsLoading(false);
    }
  };

  const streakDisplay = getStreakDisplay(profile?.current_streak || null);

  return (
    <div className="min-h-screen bg-white text-black font-mono pb-20 pt-20">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-100 py-4 z-20">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-pulse">🐾</span>
            <h1 className="text-2xl font-light"><a href='/home'>9lives</a></h1>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Fish</p>
              <p className="text-lg font-light">
                {profileLoading ? (
                  <span className="animate-pulse">Loading...</span>
                ) : (
                  <>
                    {profile?.total_points || 0} 🐟
                    {showAnimation && !hasAttempted && (
                      <span className="inline-block ml-2">
                        <span className="animate-bounce text-2xl">+1</span>
                        <span className="inline-block animate-bounce ml-1" style={{animationDelay: '0.2s'}}>🐟</span>
                      </span>
                    )}
                  </>
                )}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Streak</p>
              <p className={`text-lg font-light ${streakDisplay.className}`}>
                {profileLoading ? (
                  <span className="animate-pulse">Loading...</span>
                ) : (
                  <span className={streakDisplay.className}>
                    {streakDisplay.number} <span className={`${streakDisplay.className} ${streakDisplay.emojiClassName}`}>{streakDisplay.emoji}</span>
                  </span>
                )}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Language</p>
              <p className="text-lg font-light">{language.toUpperCase()}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Question Title */}
        <div className="text-center mb-12">
          <div className="text-4xl mb-4">🧩</div>
          <h2 className="text-3xl font-light mb-3">{question}</h2>
          <p className="text-lg text-gray-600 font-light">
            Drag and arrange the pseudocode blocks in the correct order
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-gray-50 border border-gray-100 p-6 mb-8 hover:border-black transition-all duration-500">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">📋</span>
            <h3 className="font-mono font-medium text-xl">Instructions</h3>
          </div>
          <p className="text-gray-700 font-light leading-relaxed mb-2">
            <strong>Simple Click:</strong> Click any block from the available list to move it to your sequence, or click blocks in your sequence to move them back.
          </p>
          <p className="text-gray-700 font-light leading-relaxed mb-2">
            <strong>Drag & Drop:</strong> You can also drag blocks between the lists if you prefer.
          </p>
          <p className="text-gray-600 font-light text-sm">
            <strong>Approach:</strong> {approach}
          </p>
        </div>

        {/* Error Message */}
        {showError && (
          <div className="bg-red-50 border border-red-200 p-6 mb-8 animate-pulse">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">❌</span>
              <h3 className="font-mono font-medium text-xl text-red-800">
                {availableItems.length > 0 ? "Incomplete Sequence" : "Incorrect Sequence"}
              </h3>
            </div>
            <p className="text-red-700 font-light leading-relaxed mb-4">
              {availableItems.length > 0
                ? "Please use all available blocks before proceeding. You still have blocks in the available section."
                : "The sequence you've arranged is not correct. Please review and try again."
              }
            </p>
            {availableItems.length > 0 && (
              <div className="bg-white border border-red-200 p-4 rounded">
                <h4 className="font-medium text-red-800 mb-2">Remaining blocks to use:</h4>
                <ul className="space-y-1">
                  {availableItems.map((item, index) => (
                    <li key={index} className="flex items-center gap-2 text-red-700">
                      <span className="text-sm">• {item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {availableItems.length === 0 && showCorrectSequence && (
              <div className="bg-white border border-red-200 p-4 rounded">
                <h4 className="font-medium text-red-800 mb-2">Correct Sequence:</h4>
                <ol className="space-y-2">
                  {pseudoCode.map((item, index) => (
                    <li key={index} className="flex items-center gap-2 text-red-700">
                      <span className="font-bold">{index + 1}.</span>
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {hasAttempted && availableItems.length === 0 && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-yellow-800 text-sm">
                  ⚠️ Points are only awarded on the first successful attempt. You can still proceed to continue learning.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Available Items */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📦</span>
              <h3 className="font-mono font-medium text-xl">Available Blocks</h3>
            </div>
            <div 
              className="min-h-96 border-2 border-dashed border-gray-300 p-4 space-y-3 hover:border-gray-400 transition-colors"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e)}
            >
              {availableItems.map((item, index) => (
                <div
                  key={`available-${index}-${item}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item, index, true)}
                  onTouchStart={() => handleTouchStart(item, index, true)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={(e) => handleTouchEnd(e)}
                  onClick={() => handleItemClick(item, index, true)}
                  className={`p-4 border-2 cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-lg select-none ${itemColors[item] || notionColors[0]} ${
                    touchItem?.item === item ? 'scale-105 shadow-lg' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⋮⋮</span>
                    <span className="text-sm font-medium">{item}</span>
                  </div>
                </div>
              ))}
              {availableItems.length === 0 && (
                <div className="text-center text-gray-400 py-16">
                  <div className="text-4xl mb-2">🎉</div>
                  <p>All blocks used!</p>
                </div>
              )}
            </div>
          </div>

          {/* Ordered List */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📝</span>
              <h3 className="font-mono font-medium text-xl">Your Sequence</h3>
            </div>
            <div className="min-h-96 border-2 border-gray-300 p-4 space-y-3">
              {draggedItems.map((item, index) => (
                <div key={`ordered-${index}-${item}`} className="relative">
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, item, index, false)}
                    onTouchStart={() => handleTouchStart(item, index, false)}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={(e) => handleTouchEnd(e)}
                    onClick={() => handleItemClick(item, index, false)}
                    className={`p-4 border-2 cursor-pointer relative z-10 transition-all duration-300 transform hover:scale-105 hover:shadow-lg select-none ${itemColors[item] || notionColors[0]} ${
                      touchItem?.item === item ? 'scale-105 shadow-lg' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg min-w-[2rem]">{index + 1}.</span>
                      <span className="text-lg">⋮⋮</span>
                      <span className="text-sm font-medium">{item}</span>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Drop zone for empty list or at the end */}
              <div
                className="h-16 border-2 border-dashed border-gray-400 flex items-center justify-center text-gray-500 text-sm hover:border-gray-600 hover:bg-gray-50 transition-all cursor-pointer"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, draggedItems.length)}
                onTouchEnd={(e) => handleTouchEnd(e, draggedItems.length)}
              >
                {draggedItems.length === 0 ? (
                  <>
                    <span className="text-2xl mr-2">👆</span>
                    Click blocks from available list to add here
                  </>
                ) : (
                  <>
                    <span className="text-2xl mr-2">➕</span>
                    Drop to add at end
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-8 flex justify-between items-center">
          <button 
            onClick={reset}
            className="px-6 py-3 border border-gray-300 hover:border-black hover:bg-gray-50 transition-all duration-300 font-mono"
          >
            🔄 Reset
          </button>

          <div className="flex items-center space-x-6">
            {isComplete && !hasAttempted && (
              <div className="flex items-center text-green-600 font-mono">
                <span className="text-2xl mr-2 animate-bounce">✅</span>
                <span className="font-bold">Perfect! Sequence is correct!</span>
              </div>
            )}
            {isComplete && hasAttempted && (
              <div className="flex items-center text-blue-600 font-mono">
                <span className="text-2xl mr-2">✅</span>
                <span className="font-bold">Correct! (No points - already attempted)</span>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Fixed Footer with Next Button */}
      <div className="fixed bottom-0 right-0 p-4 z-10">
        <button 
          onClick={handleNext}
          disabled={isLoading}
          className="py-2 px-4 bg-black text-white font-mono text-sm hover:bg-gray-800 transition-all duration-300 hover:scale-105 group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <span className="flex items-center gap-2">
            {isLoading ? '⏳ Processing...' : isComplete ? (hasAttempted ? '🚀 Continue' : '🚀 Next: Coding') : '📝 Check & Continue'}
            {!isLoading && (
              <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
            )}
          </span>
        </button>
      </div>
    </div>
  );
}
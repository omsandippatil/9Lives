'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// Simulate API data structure
interface DataStructure {
  id: number
  name: string
  emoji: string
  category: string
  difficulty: 'core' | 'intermediate' | 'advanced' | 'rare'
  pythonImpl: string
  javaImpl: string
  description?: string
}

const dataStructureSections = [
  {
    id: 'core',
    title: 'Tier 1 - Must Know (Core DSA)',
    icon: '🔥',
    description: 'Essential data structures that appear in 80-90% of interviews',
    count: 9
  },
  {
    id: 'intermediate', 
    title: 'Tier 2 - Advanced but Common',
    icon: '⚡',
    description: 'Advanced structures that appear regularly in senior-level interviews',
    count: 5
  },
  {
    id: 'advanced',
    title: 'Tier 3 - Specialized / Rare but Useful',
    icon: '🔍', 
    description: 'Specialized structures useful for specific problem domains',
    count: 7
  },
  {
    id: 'rare',
    title: 'Tier 4 - Rarely Asked',
    icon: '🎲',
    description: 'Theoretical structures rarely used in practical interviews', 
    count: 4
  }
]

// Mock data for each section - Fixed with explicit typing
const mockDataStructureData: Record<string, DataStructure[]> = {
  core: [
    { 
      id: 1, 
      name: 'Arrays', 
      emoji: '📊', 
      category: 'Linear', 
      difficulty: 'core' as const,
      pythonImpl: 'list (dynamic, supports slicing, resizing)',
      javaImpl: 'int[], String[] (fixed size), ArrayList<E> (dynamic)',
      description: 'Dynamic resizable collections with O(1) access'
    },
    { 
      id: 2, 
      name: 'Strings', 
      emoji: '🔤', 
      category: 'Text', 
      difficulty: 'core' as const,
      pythonImpl: 'str (immutable, slicing, regex via re)',
      javaImpl: 'String (immutable), StringBuilder, StringBuffer',
      description: 'Immutable sequences of characters'
    },
    { 
      id: 3, 
      name: 'Linked Lists', 
      emoji: '🔗', 
      category: 'Linear', 
      difficulty: 'core' as const,
      pythonImpl: 'No built-in → implement manually with classes',
      javaImpl: 'LinkedList<E> from java.util',
      description: 'Dynamic linear data structure with pointer-based nodes'
    },
    { 
      id: 4, 
      name: 'Stacks', 
      emoji: '📚', 
      category: 'LIFO', 
      difficulty: 'core' as const,
      pythonImpl: 'list with .append() & .pop(), or collections.deque',
      javaImpl: 'Stack<E>, or ArrayDeque<E> (preferred)',
      description: 'Last-In-First-Out (LIFO) data structure'
    },
    { 
      id: 5, 
      name: 'Queues', 
      emoji: '🚇', 
      category: 'FIFO', 
      difficulty: 'core' as const,
      pythonImpl: 'collections.deque, queue.Queue, PriorityQueue',
      javaImpl: 'Queue<E> (interface), LinkedList<E>, ArrayDeque<E>',
      description: 'First-In-First-Out (FIFO) data structure'
    },
    { 
      id: 6, 
      name: 'Hash Maps / Sets', 
      emoji: '🗂️', 
      category: 'Hashing', 
      difficulty: 'core' as const,
      pythonImpl: 'dict, set',
      javaImpl: 'HashMap<K,V>, HashSet<E>',
      description: 'O(1) average lookup time key-value storage'
    },
    { 
      id: 7, 
      name: 'Heaps', 
      emoji: '🏔️', 
      category: 'Priority', 
      difficulty: 'core' as const,
      pythonImpl: 'heapq (min-heap), PriorityQueue',
      javaImpl: 'PriorityQueue<E> (min-heap by default)',
      description: 'Complete binary tree with heap property'
    },
    { 
      id: 8, 
      name: 'Trees', 
      emoji: '🌳', 
      category: 'Hierarchical', 
      difficulty: 'core' as const,
      pythonImpl: 'No built-in → implement manually with classes',
      javaImpl: 'No direct built-in → implement manually, TreeMap<K,V>',
      description: 'Hierarchical structure with parent-child relationships'
    },
    { 
      id: 9, 
      name: 'Graphs', 
      emoji: '🕸️', 
      category: 'Network', 
      difficulty: 'core' as const,
      pythonImpl: 'dict of lists/sets, or defaultdict(list)',
      javaImpl: 'HashMap<Node, List<Node>>',
      description: 'Collection of vertices connected by edges'
    }
  ],
  intermediate: [
    { 
      id: 10, 
      name: 'Tries', 
      emoji: '🌟', 
      category: 'Tree', 
      difficulty: 'intermediate' as const,
      pythonImpl: 'Implement manually with dict',
      javaImpl: 'Implement manually with HashMap',
      description: 'Prefix tree for efficient string operations'
    },
    { 
      id: 11, 
      name: 'Union-Find (DSU)', 
      emoji: '🤝', 
      category: 'Disjoint Set', 
      difficulty: 'intermediate' as const,
      pythonImpl: 'Manual implementation with arrays + path compression',
      javaImpl: 'Manual implementation with arrays + path compression',
      description: 'Tracks disjoint sets with union and find operations'
    },
    { 
      id: 12, 
      name: 'Segment Trees', 
      emoji: '🌲', 
      category: 'Range Query', 
      difficulty: 'intermediate' as const,
      pythonImpl: 'Manual implementation with arrays/lists',
      javaImpl: 'Manual implementation with arrays/lists',
      description: 'Binary tree for range queries and updates'
    },
    { 
      id: 13, 
      name: 'Fenwick Tree', 
      emoji: '🎋', 
      category: 'Range Query', 
      difficulty: 'intermediate' as const,
      pythonImpl: 'Manual implementation with arrays/lists',
      javaImpl: 'Manual implementation with arrays/lists',
      description: 'Binary Indexed Tree for prefix sum queries'
    },
    { 
      id: 14, 
      name: 'Balanced BSTs', 
      emoji: '⚖️', 
      category: 'Self-Balancing', 
      difficulty: 'intermediate' as const,
      pythonImpl: 'bisect module, sortedcontainers library',
      javaImpl: 'TreeMap<K,V>, TreeSet<E> (Red-Black tree)',
      description: 'Self-balancing binary search trees'
    }
  ],
  advanced: [
    { 
      id: 15, 
      name: 'B-Trees / B+ Trees', 
      emoji: '🗄️', 
      category: 'Database', 
      difficulty: 'advanced' as const,
      pythonImpl: 'Not in std libs, implement manually',
      javaImpl: 'Not in std libs, implement manually',
      description: 'Multi-way trees used in databases and file systems'
    },
    { 
      id: 16, 
      name: 'Skip Lists', 
      emoji: '⏭️', 
      category: 'Probabilistic', 
      difficulty: 'advanced' as const,
      pythonImpl: 'Not built-in, implement manually',
      javaImpl: 'ConcurrentSkipListMap, ConcurrentSkipListSet',
      description: 'Probabilistic data structure for fast search'
    },
    { 
      id: 17, 
      name: 'Bloom Filters', 
      emoji: '🌸', 
      category: 'Probabilistic', 
      difficulty: 'advanced' as const,
      pythonImpl: 'Implement with bit arrays & hash functions',
      javaImpl: 'Implement with bit arrays & hash functions',
      description: 'Space-efficient probabilistic membership test'
    },
    { 
      id: 18, 
      name: 'Interval Trees', 
      emoji: '📏', 
      category: 'Interval', 
      difficulty: 'advanced' as const,
      pythonImpl: 'Implement manually for range queries',
      javaImpl: 'Implement manually for range queries',
      description: 'Binary tree for storing intervals and range queries'
    },
    { 
      id: 19, 
      name: 'Sparse Table', 
      emoji: '📋', 
      category: 'Range Query', 
      difficulty: 'advanced' as const,
      pythonImpl: 'Implement manually for static RMQ',
      javaImpl: 'Implement manually for static RMQ',
      description: 'Data structure for static Range Minimum Queries'
    },
    { 
      id: 20, 
      name: 'Suffix Trees', 
      emoji: '🌿', 
      category: 'String', 
      difficulty: 'advanced' as const,
      pythonImpl: 'Implement manually, libraries exist',
      javaImpl: 'Implement manually, libraries exist',
      description: 'Compressed trie of all suffixes for string processing'
    },
    { 
      id: 21, 
      name: 'K-D Trees', 
      emoji: '🎯', 
      category: 'Spatial', 
      difficulty: 'advanced' as const,
      pythonImpl: 'Implement manually for spatial problems',
      javaImpl: 'Implement manually for spatial problems',
      description: 'Multi-dimensional binary search tree for spatial data'
    }
  ],
  rare: [
    { 
      id: 22, 
      name: 'Ropes', 
      emoji: '🪢', 
      category: 'String', 
      difficulty: 'rare' as const,
      pythonImpl: 'Not in std lib, implement with balanced trees',
      javaImpl: 'StringBuffer/StringBuilder partially serve this',
      description: 'Binary tree for efficient string concatenation'
    },
    { 
      id: 23, 
      name: 'Van Emde Boas Trees', 
      emoji: '🔢', 
      category: 'Theoretical', 
      difficulty: 'rare' as const,
      pythonImpl: 'Not in std lib, very theoretical',
      javaImpl: 'Not in std lib, very theoretical',
      description: 'Tree structure supporting operations in O(log log U) time'
    },
    { 
      id: 24, 
      name: 'Priority Search Trees', 
      emoji: '🔍', 
      category: 'Geometric', 
      difficulty: 'rare' as const,
      pythonImpl: 'Implement manually, very rare',
      javaImpl: 'Implement manually, very rare',
      description: 'Data structure for 2D range searching'
    },
    { 
      id: 25, 
      name: 'Multimaps / Multisets', 
      emoji: '🗃️', 
      category: 'Collection', 
      difficulty: 'rare' as const,
      pythonImpl: 'collections.Counter, defaultdict(list)',
      javaImpl: 'Simulate with HashMap<K, List<V>>',
      description: 'Maps/sets that allow duplicate keys/values'
    }
  ]
}

// Simulate API call with delay
const fetchDataStructures = async (sectionId: string): Promise<DataStructure[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockDataStructureData[sectionId] || [])
    }, 1500) // 1.5 second delay to show loading
  })
}

export default function DataStructuresPage() {
  const [catAnimation, setCatAnimation] = useState('🐱')
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['core'])) // First section open by default
  const [loadedData, setLoadedData] = useState<Record<string, DataStructure[]>>({})
  const [loadingSections, setLoadingSections] = useState<Set<string>>(new Set(['core'])) // Load core on mount
  const router = useRouter()

  // Cat animation cycle
  useEffect(() => {
    const cats = ['🐱', '😸', '😺', '😻', '🙀', '😽', '😼']
    let index = 0
    
    const interval = setInterval(() => {
      index = (index + 1) % cats.length
      setCatAnimation(cats[index])
    }, 2000)
    
    return () => clearInterval(interval)
  }, [])

  // Load core data structures on mount
  useEffect(() => {
    loadSectionData('core')
  }, [])

  const loadSectionData = async (sectionId: string) => {
    if (loadedData[sectionId]) return // Already loaded
    
    setLoadingSections(prev => new Set(prev).add(sectionId))
    
    try {
      const data = await fetchDataStructures(sectionId)
      setLoadedData(prev => ({ ...prev, [sectionId]: data }))
    } catch (error) {
      console.error('Failed to load section data:', error)
    } finally {
      setLoadingSections(prev => {
        const newSet = new Set(prev)
        newSet.delete(sectionId)
        return newSet
      })
    }
  }

  const toggleSection = (sectionId: string) => {
    const newOpenSections = new Set(openSections)
    
    if (newOpenSections.has(sectionId)) {
      newOpenSections.delete(sectionId)
    } else {
      newOpenSections.add(sectionId)
      // Load data if not already loaded and not currently loading
      if (!loadedData[sectionId] && !loadingSections.has(sectionId)) {
        loadSectionData(sectionId)
      }
    }
    
    setOpenSections(newOpenSections)
  }

  const handleTopicClick = (topicId: number) => {
    router.push(`/library/data-structures/${topicId}`)
  }

  const handleBack = () => {
    router.back()
  }

  const renderSkeletonGrid = (count: number) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="border-2 border-gray-200 p-4 bg-gray-50">
          <div className="flex flex-col space-y-3 h-48">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
              <div className="flex-1 space-y-1">
                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-2 bg-gray-200 rounded w-full animate-pulse"></div>
              <div className="h-2 bg-gray-200 rounded w-3/4 animate-pulse"></div>
            </div>
            <div className="space-y-2">
              <div className="h-2 bg-gray-200 rounded w-full animate-pulse"></div>
              <div className="h-2 bg-gray-200 rounded w-5/6 animate-pulse"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  const renderDataStructureGrid = (dataStructures: DataStructure[]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
      {dataStructures.map((ds) => (
        <div
          key={ds.id}
          onClick={() => handleTopicClick(ds.id)}
          className="border-2 p-4 transition-all duration-300 cursor-pointer relative group bg-white border-gray-200 hover:border-black hover:bg-gray-50"
        >
          <div className="flex flex-col space-y-3 h-48">
            <div className="flex items-center space-x-3">
              <div className="text-2xl transition-transform duration-300 group-hover:scale-110">
                {ds.emoji}
              </div>
              <div className="flex-1">
                <h3 className="font-mono text-sm font-medium leading-tight">
                  {ds.name}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  {ds.category}
                </p>
              </div>
              <div className="text-xs text-gray-400">#{ds.id}</div>
            </div>
            
            {ds.description && (
              <p className="text-xs text-gray-600 leading-relaxed">
                {ds.description}
              </p>
            )}
            
            <div className="space-y-2 text-xs">
              <div>
                <span className="font-mono font-medium text-blue-600">🐍 &nbsp;Python:</span>
                <p className="text-gray-600 mt-1 leading-tight">{ds.pythonImpl}</p>
              </div>
              <div>
                <span className="font-mono font-medium text-orange-600">☕ &nbsp;Java:</span>
                <p className="text-gray-600 mt-1 leading-tight">{ds.javaImpl}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen bg-white text-black font-mono">
      {/* Header */}
      <header className="border-b border-gray-100 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleBack}
              className="group flex items-center gap-2 text-gray-600 hover:text-black transition-all duration-300 font-mono text-sm"
            >
              <div className="w-8 h-8 border border-gray-200 group-hover:border-black flex items-center justify-center group-hover:bg-gray-50 transition-all duration-300">
                <span className="transform group-hover:-translate-x-0.5 transition-transform duration-300">←</span>
              </div>
              <span className="group-hover:translate-x-1 transition-transform duration-300">Back</span>
            </button>
          </div>
          
          <div className="text-center">
            <span className="text-2xl animate-pulse">{catAnimation}</span>
            <h1 className="text-2xl font-light">Data Structures</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Tiers</p>
              <p className="text-lg font-light">{dataStructureSections.length}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 pb-32">
        <div className="max-w-7xl mx-auto mt-8">
          {dataStructureSections.map((section) => {
            const isOpen = openSections.has(section.id)
            const isLoading = loadingSections.has(section.id)
            const dataStructures = loadedData[section.id] || []
            
            return (
              <div key={section.id} className="mb-8">
                {/* Section Header */}
                <div 
                  onClick={() => toggleSection(section.id)}
                  className="border-2 border-gray-200 p-6 cursor-pointer hover:border-black transition-all duration-300 bg-white hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{section.icon}</span>
                      <div>
                        <h2 className="text-lg font-mono font-medium">{section.title}</h2>
                        <p className="text-sm text-gray-600 mt-1">{section.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-sm font-mono text-gray-400">{section.count} structures</div>
                        {isLoading && (
                          <div className="text-xs text-blue-500 mt-1">Loading...</div>
                        )}
                      </div>
                      <div className={`transform transition-transform duration-300 text-xl ${isOpen ? 'rotate-180' : ''}`}>
                        ↓
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section Content */}
                {isOpen && (
                  <div className="border-l-2 border-r-2 border-b-2 border-gray-200 border-t-0 p-6 bg-gray-50">
                    {isLoading ? (
                      renderSkeletonGrid(section.count)
                    ) : (
                      renderDataStructureGrid(dataStructures)
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Overview Section */}
        <div className="max-w-4xl mx-auto mt-16">
          <div className="bg-gray-50 border border-gray-200 p-8">
            <div className="text-center mb-6">
              <div className="text-3xl mb-4">{catAnimation}</div>
              <h3 className="font-mono text-lg mb-2">Your Data Structures Mastery Journey</h3>
              <p className="text-gray-600 text-sm">Master the fundamental building blocks of efficient algorithms!</p>
            </div>
            
            {/* Language Implementation Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-blue-600 font-mono font-medium">🐍 &nbsp;Python</span>
                </div>
                <p className="text-xs text-blue-700">Built-in collections, manual implementations for advanced structures</p>
              </div>
              <div className="bg-orange-50 border border-orange-200 p-4 rounded">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-orange-600 font-mono font-medium">☕ &nbsp;Java</span>
                </div>
                <p className="text-xs text-orange-700">Rich Collections framework, TreeMap/TreeSet for balanced structures</p>
              </div>
            </div>
            
            {/* Data Structure Categories Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              {dataStructureSections.map((section) => (
                <div key={section.id} className="text-center">
                  <div className="text-2xl mb-2">{section.icon}</div>
                  <div className="text-xs font-mono text-gray-600 mb-1">
                    {section.title.includes('Tier') ? section.title.split(' - ')[0] : section.title.split(' ')[0]}
                  </div>
                  <div className="text-xs text-gray-500">{section.count} structures</div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <div className="inline-flex items-center gap-2 text-sm text-gray-600 bg-white px-4 py-2 border border-gray-200">
                <span>💡</span>
                <span className="font-mono">Click on structures to see implementation details for Python & Java</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer section */}
        <div className="text-center py-16 border-t border-gray-100 mt-12">
          <div className="max-w-2xl mx-auto">
            <div className="text-4xl mb-6">{catAnimation}</div>
            <p className="font-mono text-gray-500 mb-4">
              Ready to master the data structures that power efficient algorithms?
            </p>
            <div className="text-sm text-gray-400 font-mono">
              {dataStructureSections.reduce((acc, section) => acc + section.count, 0)} data structures to explore • From basic arrays to advanced trees
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
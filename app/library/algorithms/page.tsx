'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// Simulate API data structure
interface Algorithm {
  id: number
  name: string
  emoji: string
  category: string
  difficulty: 'core' | 'intermediate' | 'advanced' | 'rare'
}

const algorithmSections = [
  {
    id: 'core',
    title: 'Core & Most Common',
    icon: '🔥',
    description: 'Must-master algorithms that appear in 80–90% of interviews',
    count: 20
  },
  {
    id: 'intermediate', 
    title: 'Intermediate',
    icon: '⚡',
    description: 'Appear regularly, especially in FAANG & mid-senior interviews',
    count: 15
  },
  {
    id: 'advanced',
    title: 'Advanced / Specialized',
    icon: '🔍', 
    description: 'Less frequent, but useful to know for comprehensive preparation',
    count: 13
  },
  {
    id: 'rare',
    title: 'Rare / Niche',
    icon: '🎲',
    description: 'Competitive programming & advanced system roles', 
    count: 6
  }
]

// Mock data for each section - Fixed with explicit typing
const mockAlgorithmData: Record<string, Algorithm[]> = {
  core: [
    { id: 1, name: 'Two Pointers', emoji: '👉', category: 'Array/String', difficulty: 'core' as const },
    { id: 2, name: 'Sliding Window', emoji: '🪟', category: 'Array/String', difficulty: 'core' as const },
    { id: 3, name: 'Binary Search', emoji: '🔍', category: 'Search', difficulty: 'core' as const },
    { id: 4, name: 'Prefix Sum', emoji: '📊', category: 'Array', difficulty: 'core' as const },
    { id: 5, name: 'Hashing', emoji: '🗂️', category: 'Data Structure', difficulty: 'core' as const },
    { id: 6, name: 'Sorting', emoji: '📈', category: 'Algorithm', difficulty: 'core' as const },
    { id: 7, name: 'Kadane\'s Algorithm', emoji: '💪', category: 'Dynamic Programming', difficulty: 'core' as const },
    { id: 8, name: 'Greedy Algorithms', emoji: '🎯', category: 'Optimization', difficulty: 'core' as const },
    { id: 9, name: 'Depth-First Search', emoji: '🕳️', category: 'Graph/Tree', difficulty: 'core' as const },
    { id: 10, name: 'Breadth-First Search', emoji: '🌊', category: 'Graph/Tree', difficulty: 'core' as const },
    { id: 11, name: 'Binary Tree Traversals', emoji: '🌳', category: 'Tree', difficulty: 'core' as const },
    { id: 12, name: 'Lowest Common Ancestor', emoji: '🏔️', category: 'Tree', difficulty: 'core' as const },
    { id: 13, name: 'Backtracking', emoji: '🔄', category: 'Recursion', difficulty: 'core' as const },
    { id: 14, name: 'Dynamic Programming Basics', emoji: '💎', category: 'Dynamic Programming', difficulty: 'core' as const },
    { id: 15, name: '0/1 Knapsack', emoji: '🎒', category: 'Dynamic Programming', difficulty: 'core' as const },
    { id: 16, name: 'Longest Increasing Subsequence', emoji: '📏', category: 'Dynamic Programming', difficulty: 'core' as const },
    { id: 17, name: 'Longest Common Subsequence', emoji: '🧬', category: 'Dynamic Programming', difficulty: 'core' as const },
    { id: 18, name: 'Matrix DP', emoji: '🏁', category: 'Dynamic Programming', difficulty: 'core' as const },
    { id: 19, name: 'Graph Cycle Detection', emoji: '🔄', category: 'Graph', difficulty: 'core' as const },
    { id: 20, name: 'Union-Find', emoji: '🤝', category: 'Data Structure', difficulty: 'core' as const }
  ],
  intermediate: [
    { id: 21, name: 'Topological Sort', emoji: '📋', category: 'Graph', difficulty: 'intermediate' as const },
    { id: 22, name: 'Dijkstra\'s Algorithm', emoji: '🛣️', category: 'Graph', difficulty: 'intermediate' as const },
    { id: 23, name: 'Kruskal\'s Algorithm', emoji: '🌲', category: 'Graph', difficulty: 'intermediate' as const },
    { id: 24, name: 'Prim\'s Algorithm', emoji: '🌿', category: 'Graph', difficulty: 'intermediate' as const },
    { id: 25, name: 'Bellman-Ford Algorithm', emoji: '⚖️', category: 'Graph', difficulty: 'intermediate' as const },
    { id: 26, name: 'Floyd-Warshall Algorithm', emoji: '🗺️', category: 'Graph', difficulty: 'intermediate' as const },
    { id: 27, name: 'Monotonic Stack', emoji: '📚', category: 'Stack', difficulty: 'intermediate' as const },
    { id: 28, name: 'Monotonic Queue', emoji: '🚇', category: 'Queue', difficulty: 'intermediate' as const },
    { id: 29, name: 'Trie', emoji: '🌟', category: 'Data Structure', difficulty: 'intermediate' as const },
    { id: 30, name: 'Segment Tree', emoji: '🌲', category: 'Data Structure', difficulty: 'intermediate' as const },
    { id: 31, name: 'Fenwick Tree', emoji: '🎋', category: 'Data Structure', difficulty: 'intermediate' as const },
    { id: 32, name: 'Tree Dynamic Programming', emoji: '🌳', category: 'Dynamic Programming', difficulty: 'intermediate' as const },
    { id: 33, name: 'Binary Lifting', emoji: '⬆️', category: 'Tree', difficulty: 'intermediate' as const },
    { id: 34, name: 'Divide & Conquer', emoji: '⚔️', category: 'Algorithm', difficulty: 'intermediate' as const },
    { id: 35, name: 'Heap Algorithms', emoji: '🏔️', category: 'Data Structure', difficulty: 'intermediate' as const }
  ],
  advanced: [
    { id: 36, name: 'String Hashing', emoji: '🔤', category: 'String', difficulty: 'advanced' as const },
    { id: 37, name: 'KMP Algorithm', emoji: '🔍', category: 'String', difficulty: 'advanced' as const },
    { id: 38, name: 'Z-Algorithm', emoji: '⚡', category: 'String', difficulty: 'advanced' as const },
    { id: 39, name: 'Manacher\'s Algorithm', emoji: '🪞', category: 'String', difficulty: 'advanced' as const },
    { id: 40, name: 'Bit Manipulation', emoji: '💻', category: 'Bit Operations', difficulty: 'advanced' as const },
    { id: 41, name: 'Sweep Line Algorithm', emoji: '📏', category: 'Geometry', difficulty: 'advanced' as const },
    { id: 42, name: 'Lazy Propagation', emoji: '😴', category: 'Data Structure', difficulty: 'advanced' as const },
    { id: 43, name: 'Fast Exponentiation', emoji: '💨', category: 'Math', difficulty: 'advanced' as const },
    { id: 44, name: 'Matrix Exponentiation', emoji: '🔢', category: 'Math', difficulty: 'advanced' as const },
    { id: 45, name: 'Meet-in-the-Middle', emoji: '🤝', category: 'Optimization', difficulty: 'advanced' as const },
    { id: 46, name: 'Tarjan\'s Algorithm', emoji: '🌉', category: 'Graph', difficulty: 'advanced' as const },
    { id: 47, name: 'Kosaraju\'s Algorithm', emoji: '🔗', category: 'Graph', difficulty: 'advanced' as const },
    { id: 48, name: 'A* Search Algorithm', emoji: '⭐', category: 'Search', difficulty: 'advanced' as const }
  ],
  rare: [
    { id: 49, name: 'Reservoir Sampling', emoji: '🪣', category: 'Sampling', difficulty: 'rare' as const },
    { id: 50, name: 'Fisher-Yates Shuffle', emoji: '🎲', category: 'Randomization', difficulty: 'rare' as const },
    { id: 51, name: 'Bloom Filter', emoji: '🌸', category: 'Probabilistic', difficulty: 'rare' as const },
    { id: 52, name: 'DSU with Rollback', emoji: '⏪', category: 'Data Structure', difficulty: 'rare' as const },
    { id: 53, name: 'Fast Fourier Transform', emoji: '🌊', category: 'Math', difficulty: 'rare' as const },
    { id: 54, name: 'Convex Hull', emoji: '🔺', category: 'Geometry', difficulty: 'rare' as const }
  ]
}

// Simulate API call with delay
const fetchAlgorithms = async (sectionId: string): Promise<Algorithm[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockAlgorithmData[sectionId] || [])
    }, 1500) // 1.5 second delay to show loading
  })
}

export default function AlgorithmsPage() {
  const [catAnimation, setCatAnimation] = useState('🐱')
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['core'])) // First section open by default
  const [loadedData, setLoadedData] = useState<Record<string, Algorithm[]>>({})
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

  // Load core algorithms on mount
  useEffect(() => {
    loadSectionData('core')
  }, [])

  const loadSectionData = async (sectionId: string) => {
    if (loadedData[sectionId]) return // Already loaded
    
    setLoadingSections(prev => new Set(prev).add(sectionId))
    
    try {
      const data = await fetchAlgorithms(sectionId)
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
    router.push(`/library/algorithms/${topicId}`)
  }

  const handleBack = () => {
    router.back()
  }

  const renderSkeletonGrid = (count: number) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mt-6">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="border-2 border-gray-200 p-4 bg-gray-50">
          <div className="flex flex-col items-center justify-center space-y-3 h-32">
            <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
            <div className="text-center space-y-2">
              <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
              <div className="h-2 bg-gray-200 rounded w-12 animate-pulse"></div>
            </div>
            <div className="h-2 bg-gray-200 rounded w-8 animate-pulse"></div>
          </div>
        </div>
      ))}
    </div>
  )

  const renderAlgorithmGrid = (algorithms: Algorithm[]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mt-6">
      {algorithms.map((topic) => (
        <div
          key={topic.id}
          onClick={() => handleTopicClick(topic.id)}
          className="border-2 p-4 transition-all duration-300 cursor-pointer relative group bg-white border-gray-200 hover:border-black hover:bg-gray-50"
        >
          <div className="flex flex-col items-center justify-center space-y-3 h-32">
            <div className="text-2xl transition-transform duration-300 group-hover:scale-110">
              {topic.emoji}
            </div>
            <div className="text-center">
              <h3 className="font-mono text-xs font-medium leading-tight mb-1">
                {topic.name}
              </h3>
              <p className="text-xs leading-tight text-gray-500">
                {topic.category}
              </p>
            </div>
            <div className="text-xs text-gray-400">#{topic.id}</div>
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
            <h1 className="text-2xl font-light">Algorithms</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Sections</p>
              <p className="text-lg font-light">{algorithmSections.length}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 pb-32">
        <div className="max-w-7xl mx-auto mt-8">
          {algorithmSections.map((section) => {
            const isOpen = openSections.has(section.id)
            const isLoading = loadingSections.has(section.id)
            const algorithms = loadedData[section.id] || []
            
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
                        <div className="text-sm font-mono text-gray-400">{section.count} algorithms</div>
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
                      renderAlgorithmGrid(algorithms)
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
              <h3 className="font-mono text-lg mb-2">Your Algorithm Mastery Journey</h3>
              <p className="text-gray-600 text-sm">Master the algorithms that power modern software engineering!</p>
            </div>
            
            {/* Algorithm Categories Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              {algorithmSections.map((section) => (
                <div key={section.id} className="text-center">
                  <div className="text-2xl mb-2">{section.icon}</div>
                  <div className="text-xs font-mono text-gray-600 mb-1">{section.title.split(' ')[0]}</div>
                  <div className="text-xs text-gray-500">{section.count} algorithms</div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <div className="inline-flex items-center gap-2 text-sm text-gray-600 bg-white px-4 py-2 border border-gray-200">
                <span>💡</span>
                <span className="font-mono">Expand sections to explore algorithms on demand</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer section */}
        <div className="text-center py-16 border-t border-gray-100 mt-12">
          <div className="max-w-2xl mx-auto">
            <div className="text-4xl mb-6">{catAnimation}</div>
            <p className="font-mono text-gray-500 mb-4">
              Ready to master the algorithms that power tech giants?
            </p>
            <div className="text-sm text-gray-400 font-mono">
              {algorithmSections.reduce((acc, section) => acc + section.count, 0)} algorithms to explore • From fundamentals to advanced techniques
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
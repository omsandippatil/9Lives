'use client';

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// Python syntax topic structure
interface Topic {
  id: number
  name: string
  emoji: string
  category: string
  difficulty: 'basics' | 'intermediate' | 'advanced' | 'expert'
}

const pythonSections = [
  {
    id: 'basics',
    title: 'Basics & Operators',
    icon: '🐱',
    description: 'Fundamental Python syntax and operators - start here',
    count: 8
  },
  {
    id: 'structures', 
    title: 'Data Structures',
    icon: '📦',
    description: 'Built-in data types and advanced collections',
    count: 26
  },
  {
    id: 'control',
    title: 'Control Flow & Functions',
    icon: '🔀',
    description: 'Program flow control and function definitions',
    count: 4
  },
  {
    id: 'modules',
    title: 'Modules, OOP & Exceptions',
    icon: '🏗️',
    description: 'Object-oriented programming and error handling',
    count: 3
  },
  {
    id: 'files',
    title: 'File Handling & Iterables',
    icon: '📁',
    description: 'File operations and data iteration patterns',
    count: 3
  },
  {
    id: 'typing',
    title: 'Typing & Functional Programming',
    icon: '⚡',
    description: 'Type hints and functional programming concepts',
    count: 2
  },
  {
    id: 'advanced',
    title: 'Advanced & Concurrency',
    icon: '🚀',
    description: 'Advanced features and parallel programming',
    count: 2
  },
  {
    id: 'libraries',
    title: 'Libraries & Testing',
    icon: '🧪',
    description: 'Standard library modules and testing frameworks',
    count: 2
  }
]

// Mock data for each section
const mockPythonData: Record<string, Topic[]> = {
  basics: [
    { id: 1, name: 'Keywords', emoji: '🔑', category: 'Language', difficulty: 'basics' as const },
    { id: 2, name: 'Identifiers', emoji: '🏷️', category: 'Language', difficulty: 'basics' as const },
    { id: 3, name: 'Variables', emoji: '📦', category: 'Data', difficulty: 'basics' as const },
    { id: 4, name: 'Data Types', emoji: '🎭', category: 'Types', difficulty: 'basics' as const },
    { id: 5, name: 'Comments', emoji: '💬', category: 'Documentation', difficulty: 'basics' as const },
    { id: 6, name: 'Indentation', emoji: '📏', category: 'Syntax', difficulty: 'basics' as const },
    { id: 7, name: 'Input & Output', emoji: '⌨️', category: 'I/O', difficulty: 'basics' as const },
    { id: 8, name: 'Operators', emoji: '➕', category: 'Operations', difficulty: 'basics' as const }
  ],
  structures: [
    { id: 9, name: 'String', emoji: '🔤', category: 'Sequence', difficulty: 'basics' as const },
    { id: 10, name: 'List', emoji: '📝', category: 'Sequence', difficulty: 'basics' as const },
    { id: 11, name: 'Tuple', emoji: '🎯', category: 'Sequence', difficulty: 'basics' as const },
    { id: 12, name: 'Dictionary', emoji: '📖', category: 'Mapping', difficulty: 'basics' as const },
    { id: 13, name: 'Set', emoji: '🎲', category: 'Collection', difficulty: 'basics' as const },
    { id: 14, name: 'Frozenset', emoji: '❄️', category: 'Collection', difficulty: 'intermediate' as const },
    { id: 15, name: 'Range', emoji: '📊', category: 'Sequence', difficulty: 'basics' as const },
    { id: 16, name: 'Array', emoji: '🗂️', category: 'Numeric', difficulty: 'intermediate' as const },
    { id: 17, name: 'Bytes', emoji: '🔢', category: 'Binary', difficulty: 'intermediate' as const },
    { id: 18, name: 'Bytearray', emoji: '🔄', category: 'Binary', difficulty: 'intermediate' as const },
    { id: 19, name: 'Memoryview', emoji: '🔍', category: 'Binary', difficulty: 'advanced' as const },
    { id: 20, name: 'Deque', emoji: '⚖️', category: 'Collections', difficulty: 'intermediate' as const },
    { id: 21, name: 'NamedTuple', emoji: '🏷️', category: 'Collections', difficulty: 'intermediate' as const },
    { id: 22, name: 'DefaultDict', emoji: '🎯', category: 'Collections', difficulty: 'intermediate' as const },
    { id: 23, name: 'OrderedDict', emoji: '📋', category: 'Collections', difficulty: 'intermediate' as const },
    { id: 24, name: 'Counter', emoji: '🔢', category: 'Collections', difficulty: 'intermediate' as const },
    { id: 25, name: 'ChainMap', emoji: '🔗', category: 'Collections', difficulty: 'advanced' as const },
    { id: 26, name: 'UserDict', emoji: '👤', category: 'Collections', difficulty: 'advanced' as const },
    { id: 27, name: 'UserList', emoji: '📋', category: 'Collections', difficulty: 'advanced' as const },
    { id: 28, name: 'UserString', emoji: '📝', category: 'Collections', difficulty: 'advanced' as const },
    { id: 29, name: 'Heap', emoji: '🏔️', category: 'Queue', difficulty: 'intermediate' as const },
    { id: 30, name: 'Queue', emoji: '🚶', category: 'Queue', difficulty: 'intermediate' as const },
    { id: 31, name: 'LifoQueue', emoji: '📚', category: 'Queue', difficulty: 'intermediate' as const },
    { id: 32, name: 'PriorityQueue', emoji: '🎖️', category: 'Queue', difficulty: 'intermediate' as const },
    { id: 33, name: 'Multiprocessing Queue', emoji: '🔄', category: 'Queue', difficulty: 'advanced' as const },
    { id: 34, name: 'MappingProxyType', emoji: '🔒', category: 'Collections', difficulty: 'advanced' as const }
  ],
  control: [
    { id: 35, name: 'Control Flow', emoji: '🔀', category: 'Flow Control', difficulty: 'basics' as const },
    { id: 36, name: 'Functions', emoji: '⚙️', category: 'Functions', difficulty: 'basics' as const },
    { id: 37, name: 'Lambda & Decorators', emoji: '✨', category: 'Functions', difficulty: 'intermediate' as const },
    { id: 38, name: 'Recursion & Closures', emoji: '🔄', category: 'Functions', difficulty: 'advanced' as const }
  ],
  modules: [
    { id: 39, name: 'Modules & Packages', emoji: '📦', category: 'Organization', difficulty: 'intermediate' as const },
    { id: 40, name: 'Object-Oriented Programming', emoji: '🏗️', category: 'OOP', difficulty: 'intermediate' as const },
    { id: 41, name: 'Exceptions & Error Handling', emoji: '🚨', category: 'Error Handling', difficulty: 'intermediate' as const }
  ],
  files: [
    { id: 42, name: 'File Handling', emoji: '📁', category: 'I/O', difficulty: 'intermediate' as const },
    { id: 43, name: 'Comprehensions', emoji: '🎯', category: 'Syntax', difficulty: 'intermediate' as const },
    { id: 44, name: 'Iterators & Generators', emoji: '♻️', category: 'Iteration', difficulty: 'advanced' as const }
  ],
  typing: [
    { id: 45, name: 'Typing & Annotations', emoji: '🏷️', category: 'Types', difficulty: 'advanced' as const },
    { id: 46, name: 'Functional Programming', emoji: '⚡', category: 'Paradigm', difficulty: 'advanced' as const }
  ],
  advanced: [
    { id: 47, name: 'Advanced Python', emoji: '🚀', category: 'Advanced', difficulty: 'expert' as const },
    { id: 48, name: 'Concurrency & Parallelism', emoji: '🔄', category: 'Threading', difficulty: 'expert' as const }
  ],
  libraries: [
    { id: 49, name: 'Built-in Functions & Standard Library', emoji: '🧰', category: 'Standard Lib', difficulty: 'intermediate' as const },
    { id: 50, name: 'Testing & Debugging', emoji: '🧪', category: 'Quality', difficulty: 'intermediate' as const }
  ]
}

// Simulate API call with delay
const fetchTopics = async (sectionId: string): Promise<Topic[]> => {
  return new Promise((resolve) => {
    resolve(mockPythonData[sectionId] || [])
  })
}

export default function PythonSyntaxPage() {
  const [catAnimation, setCatAnimation] = useState('🐱')
  const [openSections, setOpenSections] = useState(new Set(['basics', 'structures']))
  const [loadedData, setLoadedData] = useState<Record<string, Topic[]>>({})
  const [loadingSections, setLoadingSections] = useState<Set<string>>(new Set(['basics', 'structures']))
  const router = useRouter()

  // Cat animation cycle
  useEffect(() => {
    const cats = ['🐱', '😺', '😸', '😹', '😻', '😽', '🙀', '😿', '😾']
    let index = 0
    
    const interval = setInterval(() => {
      index = (index + 1) % cats.length
      setCatAnimation(cats[index])
    }, 2000)
    
    return () => clearInterval(interval)
  }, [])

  // Load basics and structures on mount
  useEffect(() => {
    loadSectionData('basics')
    loadSectionData('structures')
  }, [])

  const loadSectionData = async (sectionId: string) => {
    if (loadedData[sectionId]) return
    
    setLoadingSections(prev => new Set(prev).add(sectionId))
    
    try {
      const data = await fetchTopics(sectionId)
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
      if (!loadedData[sectionId] && !loadingSections.has(sectionId)) {
        loadSectionData(sectionId)
      }
    }
    
    setOpenSections(newOpenSections)
  }

  const handleTopicClick = (topicId: number) => {
    router.push(`/python/${topicId}`)
  }

  const handleBack = () => {
    router.back()
  }

  const getDifficultyColor = (difficulty: 'basics' | 'intermediate' | 'advanced' | 'expert') => {
    switch (difficulty) {
      case 'basics': return 'bg-green-100 text-green-700 border-green-200'
      case 'intermediate': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'advanced': return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'expert': return 'bg-red-100 text-red-700 border-red-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
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

  const renderTopicGrid = (topics: Topic[]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 mt-6">
      {topics.map((topic) => (
        <div
          key={topic.id}
          onClick={() => handleTopicClick(topic.id)}
          className="border-2 p-4 transition-all duration-300 cursor-pointer relative group bg-white border-gray-200 hover:border-blue-500 hover:bg-blue-50"
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
            <div className={`text-xs px-2 py-1 rounded border font-mono ${getDifficultyColor(topic.difficulty)}`}>
              {topic.difficulty}
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  const totalTopics = pythonSections.reduce((acc, section) => acc + section.count, 0)

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
            <h1 className="text-2xl font-light">Python Syntax</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Topics</p>
              <p className="text-lg font-light">{totalTopics}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 pb-32">
        <div className="max-w-7xl mx-auto mt-8">
          {pythonSections.map((section) => {
            const isOpen = openSections.has(section.id)
            const isLoading = loadingSections.has(section.id)
            const topics = loadedData[section.id] || []
            
            return (
              <div key={section.id} className="mb-8">
                {/* Section Header */}
                <div 
                  onClick={() => toggleSection(section.id)}
                  className="border-2 border-gray-200 p-6 cursor-pointer hover:border-blue-500 transition-all duration-300 bg-white hover:bg-blue-50"
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
                        <div className="text-sm font-mono text-gray-400">{section.count} topics</div>
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
                      renderTopicGrid(topics)
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
              <h3 className="font-mono text-lg mb-2">Master Python Syntax</h3>
              <p className="text-gray-600 text-sm">From basics to advanced concepts - your complete Python reference!</p>
            </div>
            
            {/* Difficulty Legend */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <div className="text-center">
                <div className={`text-xs px-3 py-2 rounded border font-mono ${getDifficultyColor('basics')} mb-2`}>
                  Basics
                </div>
                <div className="text-xs text-gray-500">Start here</div>
              </div>
              <div className="text-center">
                <div className={`text-xs px-3 py-2 rounded border font-mono ${getDifficultyColor('intermediate')} mb-2`}>
                  Intermediate
                </div>
                <div className="text-xs text-gray-500">Build skills</div>
              </div>
              <div className="text-center">
                <div className={`text-xs px-3 py-2 rounded border font-mono ${getDifficultyColor('advanced')} mb-2`}>
                  Advanced
                </div>
                <div className="text-xs text-gray-500">Deep dive</div>
              </div>
              <div className="text-center">
                <div className={`text-xs px-3 py-2 rounded border font-mono ${getDifficultyColor('expert')} mb-2`}>
                  Expert
                </div>
                <div className="text-xs text-gray-500">Master level</div>
              </div>
            </div>

            <div className="mt-8 text-center">
              <div className="inline-flex items-center gap-2 text-sm text-gray-600 bg-white px-4 py-2 border border-gray-200">
                <span>🐱</span>
                <span className="font-mono">Click sections to explore Python topics on demand</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer section */}
        <div className="text-center py-16 border-t border-gray-100 mt-12">
          <div className="max-w-2xl mx-auto">
            <div className="text-4xl mb-6">{catAnimation}</div>
            <p className="font-mono text-gray-500 mb-4">
              Warning: May cause excessive meowing while debugging
            </p>
            <div className="text-sm text-gray-400 font-mono">
              {totalTopics} topics • Now with 100% more cats 🐾
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
'use client';

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// SQL syntax topic structure
interface Topic {
  id: number
  name: string
  emoji: string
  category: string
  difficulty: 'basics' | 'intermediate' | 'advanced' | 'expert'
}

const sqlSections = [
  {
    id: 'basics',
    title: 'Basics',
    icon: '🐱',
    description: 'Fundamental SQL keywords and operators - start here',
    count: 5
  },
  {
    id: 'objects', 
    title: 'Database Objects',
    icon: '🗄️',
    description: 'Core database structures and components',
    count: 12
  },
  {
    id: 'constraints',
    title: 'Constraints & Keys',
    icon: '🔐',
    description: 'Data integrity and relationship management',
    count: 6
  },
  {
    id: 'ddl',
    title: 'DDL (Data Definition Language)',
    icon: '🏗️',
    description: 'Commands for creating and modifying database structure',
    count: 4
  },
  {
    id: 'dml',
    title: 'DML (Data Manipulation Language)',
    icon: '✏️',
    description: 'Commands for modifying data in tables',
    count: 4
  },
  {
    id: 'dql',
    title: 'DQL (Data Query Language)',
    icon: '🔍',
    description: 'Commands for querying and retrieving data',
    count: 7
  },
  {
    id: 'joins',
    title: 'Joins & Subqueries',
    icon: '🔗',
    description: 'Combining data from multiple tables',
    count: 7
  },
  {
    id: 'transactions',
    title: 'Transactions & Control',
    icon: '⚡',
    description: 'Data consistency and concurrency control',
    count: 3
  },
  {
    id: 'advanced',
    title: 'Advanced SQL',
    icon: '🚀',
    description: 'Advanced analytical functions and features',
    count: 1
  }
]

// Mock data for each section
const mockSqlData: Record<string, Topic[]> = {
  basics: [
    { id: 1, name: 'Keywords', emoji: '🔑', category: 'Language', difficulty: 'basics' as const },
    { id: 2, name: 'Identifiers', emoji: '🏷️', category: 'Language', difficulty: 'basics' as const },
    { id: 3, name: 'Data Types', emoji: '🎭', category: 'Types', difficulty: 'basics' as const },
    { id: 4, name: 'Comments', emoji: '💬', category: 'Documentation', difficulty: 'basics' as const },
    { id: 5, name: 'Operators (Arithmetic, Comparison, Logical)', emoji: '➕', category: 'Operations', difficulty: 'basics' as const }
  ],
  objects: [
    { id: 6, name: 'Database', emoji: '🗃️', category: 'Structure', difficulty: 'basics' as const },
    { id: 7, name: 'Schema', emoji: '📋', category: 'Structure', difficulty: 'basics' as const },
    { id: 8, name: 'Table', emoji: '📊', category: 'Structure', difficulty: 'basics' as const },
    { id: 9, name: 'Column', emoji: '📏', category: 'Structure', difficulty: 'basics' as const },
    { id: 10, name: 'Row', emoji: '📝', category: 'Structure', difficulty: 'basics' as const },
    { id: 11, name: 'View', emoji: '👁️', category: 'Virtual', difficulty: 'intermediate' as const },
    { id: 12, name: 'Index', emoji: '📇', category: 'Performance', difficulty: 'intermediate' as const },
    { id: 13, name: 'Sequence', emoji: '🔢', category: 'Generator', difficulty: 'intermediate' as const },
    { id: 14, name: 'Synonym', emoji: '🔄', category: 'Alias', difficulty: 'intermediate' as const },
    { id: 15, name: 'Stored Procedure', emoji: '⚙️', category: 'Procedure', difficulty: 'advanced' as const },
    { id: 16, name: 'Function', emoji: '🔧', category: 'Procedure', difficulty: 'advanced' as const },
    { id: 17, name: 'Trigger', emoji: '⚡', category: 'Event', difficulty: 'advanced' as const },
    { id: 18, name: 'Cursor', emoji: '👆', category: 'Navigation', difficulty: 'advanced' as const }
  ],
  constraints: [
    { id: 19, name: 'Primary Key', emoji: '🗝️', category: 'Key', difficulty: 'basics' as const },
    { id: 20, name: 'Foreign Key', emoji: '🔗', category: 'Key', difficulty: 'intermediate' as const },
    { id: 21, name: 'Unique Constraint', emoji: '⭐', category: 'Constraint', difficulty: 'basics' as const },
    { id: 22, name: 'Not Null Constraint', emoji: '❌', category: 'Constraint', difficulty: 'basics' as const },
    { id: 23, name: 'Check Constraint', emoji: '✅', category: 'Constraint', difficulty: 'intermediate' as const },
    { id: 24, name: 'Default Constraint', emoji: '🎯', category: 'Constraint', difficulty: 'basics' as const }
  ],
  ddl: [
    { id: 25, name: 'CREATE', emoji: '🏗️', category: 'DDL', difficulty: 'basics' as const },
    { id: 26, name: 'ALTER', emoji: '🔧', category: 'DDL', difficulty: 'intermediate' as const },
    { id: 27, name: 'DROP', emoji: '🗑️', category: 'DDL', difficulty: 'basics' as const },
    { id: 28, name: 'TRUNCATE', emoji: '🧹', category: 'DDL', difficulty: 'intermediate' as const }
  ],
  dml: [
    { id: 29, name: 'INSERT', emoji: '➕', category: 'DML', difficulty: 'basics' as const },
    { id: 30, name: 'UPDATE', emoji: '✏️', category: 'DML', difficulty: 'basics' as const },
    { id: 31, name: 'DELETE', emoji: '❌', category: 'DML', difficulty: 'basics' as const },
    { id: 32, name: 'MERGE', emoji: '🔄', category: 'DML', difficulty: 'advanced' as const }
  ],
  dql: [
    { id: 33, name: 'SELECT', emoji: '🔍', category: 'Query', difficulty: 'basics' as const },
    { id: 34, name: 'WHERE', emoji: '🎯', category: 'Filter', difficulty: 'basics' as const },
    { id: 35, name: 'ORDER BY', emoji: '📊', category: 'Sort', difficulty: 'basics' as const },
    { id: 36, name: 'GROUP BY', emoji: '📦', category: 'Aggregate', difficulty: 'intermediate' as const },
    { id: 37, name: 'HAVING', emoji: '🔎', category: 'Aggregate', difficulty: 'intermediate' as const },
    { id: 38, name: 'DISTINCT', emoji: '⭐', category: 'Unique', difficulty: 'basics' as const },
    { id: 39, name: 'LIMIT / TOP / FETCH', emoji: '🎪', category: 'Limit', difficulty: 'intermediate' as const }
  ],
  joins: [
    { id: 40, name: 'INNER JOIN', emoji: '🤝', category: 'Join', difficulty: 'basics' as const },
    { id: 41, name: 'LEFT JOIN', emoji: '⬅️', category: 'Join', difficulty: 'intermediate' as const },
    { id: 42, name: 'RIGHT JOIN', emoji: '➡️', category: 'Join', difficulty: 'intermediate' as const },
    { id: 43, name: 'FULL OUTER JOIN', emoji: '↔️', category: 'Join', difficulty: 'intermediate' as const },
    { id: 44, name: 'CROSS JOIN', emoji: '❌', category: 'Join', difficulty: 'advanced' as const },
    { id: 45, name: 'SELF JOIN', emoji: '🪞', category: 'Join', difficulty: 'advanced' as const },
    { id: 46, name: 'Subqueries', emoji: '🎭', category: 'Query', difficulty: 'intermediate' as const }
  ],
  transactions: [
    { id: 47, name: 'Transactions (BEGIN, COMMIT, ROLLBACK, SAVEPOINT)', emoji: '🔄', category: 'Control', difficulty: 'intermediate' as const },
    { id: 48, name: 'Constraints & Referential Integrity', emoji: '🔐', category: 'Integrity', difficulty: 'advanced' as const },
    { id: 49, name: 'Locks & Isolation Levels', emoji: '🔒', category: 'Concurrency', difficulty: 'expert' as const }
  ],
  advanced: [
    { id: 50, name: 'Window Functions (RANK, ROW_NUMBER, LEAD, LAG, PARTITION BY)', emoji: '🪟', category: 'Analytics', difficulty: 'expert' as const }
  ]
}

// Simulate API call
const fetchTopics = async (sectionId: string): Promise<Topic[]> => {
  return new Promise((resolve) => {
    resolve(mockSqlData[sectionId] || [])
  })
}

export default function SqlSyntaxPage() {
  const [catAnimation, setCatAnimation] = useState('🐱')
  const [openSections, setOpenSections] = useState(new Set(['basics', 'objects']))
  const [loadedData, setLoadedData] = useState<Record<string, Topic[]>>({})
  const [loadingSections, setLoadingSections] = useState<Set<string>>(new Set(['basics', 'objects']))
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

  // Load basics and objects on mount
  useEffect(() => {
    loadSectionData('basics')
    loadSectionData('objects')
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
    router.push(`/sql/${topicId}`)
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

  const totalTopics = sqlSections.reduce((acc, section) => acc + section.count, 0)

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
            <h1 className="text-2xl font-light">SQL Syntax</h1>
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
          {sqlSections.map((section) => {
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
              <h3 className="font-mono text-lg mb-2">Master SQL Syntax</h3>
              <p className="text-gray-600 text-sm">From basics to advanced queries - your complete SQL reference!</p>
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
                <span className="font-mono">Click sections to explore SQL topics on demand</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer section */}
        <div className="text-center py-16 border-t border-gray-100 mt-12">
          <div className="max-w-2xl mx-auto">
            <div className="text-4xl mb-6">{catAnimation}</div>
            <p className="font-mono text-gray-500 mb-4">
              Warning: May cause excessive purring while querying
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
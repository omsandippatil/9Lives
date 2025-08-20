'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const libraryTopics = [
  {
    id: 1,
    name: 'Data Structures',
    emoji: '🏗️',
    path: 'data-structures'
  },
  {
    id: 2,
    name: 'Algorithms',
    emoji: '🧮',
    path: 'algorithms'
  },
  {
    id: 3,
    name: 'Python',
    emoji: '🐍',
    path: 'python'
  },
  {
    id: 4,
    name: 'Java',
    emoji: '☕',
    path: 'java'
  },
  {
    id: 5,
    name: 'SQL',
    emoji: '🗃️',
    path: 'sql'
  }
]

export default function LibraryPage() {
  const [catAnimation, setCatAnimation] = useState('🐱')
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

  const handleTopicClick = (path: string) => {
    router.push(`/library/${path}`)
  }

  const handleBack = () => {
    router.back()
  }

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
            <h1 className="text-2xl font-light">Library</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Topics</p>
              <p className="text-lg font-light">{libraryTopics.length}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 pb-32">
        {/* Topics Row */}
        <div className="max-w-7xl mx-auto mt-12">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {libraryTopics.map((topic) => (
              <div
                key={topic.id}
                onClick={() => handleTopicClick(topic.path)}
                className="border-2 border-gray-200 p-6 transition-all duration-300 cursor-pointer relative group hover:border-black hover:bg-gray-50 bg-white"
              >
                <div className="flex flex-col items-center justify-center space-y-4 h-40">
                  <div className="text-4xl transition-transform duration-300 group-hover:scale-110">
                    {topic.emoji}
                  </div>
                  <div className="text-center">
                    <h3 className="font-mono text-sm font-medium leading-tight">
                      {topic.name}
                    </h3>
                  </div>
                  <div className="text-xs text-gray-400">#{topic.id}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cat Language Description */}
        <div className="max-w-4xl mx-auto mt-12 text-center">
          <div className="text-2xl mb-4">{catAnimation}</div>
          <p className="font-mono text-gray-600 text-sm mb-2">
            Meow meow purr-gramming! 🐱 Time to learn the paw-some fundamentals!
          </p>
          <p className="font-mono text-gray-500 text-xs">
            Whiskers say: "Master these fur-tastic coding skills!" 😸
          </p>
        </div>
      </main>
    </div>
  )
}
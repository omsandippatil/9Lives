'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { aiMlTopics, AIMlTopic } from './ai-ml'

interface UserProfile {
  id: string
  ai_ml_covered: number
}

// Helper function to read cookies
const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null
  
  const cookies = document.cookie.split(';')
  const cookie = cookies.find(cookie => cookie.trim().startsWith(`${name}=`))
  return cookie ? decodeURIComponent(cookie.split('=')[1]) : null
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
}

const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

export default function AIMlPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [catAnimation, setCatAnimation] = useState('🐱')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const router = useRouter()

  // Constants
  const TOTAL_TOPICS = aiMlTopics.length

  // Helper function to check if a topic is completed
  const isTopicCompleted = (topicId: number): boolean => {
    if (!profile) return false
    return topicId <= profile.ai_ml_covered
  }

  // Helper function to check if a topic is accessible
  const isTopicAccessible = (topicId: number): boolean => {
    if (!profile) return false
    return topicId <= profile.ai_ml_covered + 1 // Current + 1 next topic is accessible
  }

  // Cat animation cycle (keeping the same theme)
  useEffect(() => {
    const cats = ['🐱', '😸', '😺', '😻', '🙀', '😽', '😼']
    let index = 0
    
    const interval = setInterval(() => {
      index = (index + 1) % cats.length
      setCatAnimation(cats[index])
    }, 2000)
    
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    loadUserProfile()
  }, [])

  const loadUserProfile = async () => {
    try {
      // Check if Supabase is properly initialized
      if (!supabase) {
        setError('Database connection not available')
        setLoading(false)
        return
      }

      // Get user ID from client-accessible cookie or localStorage
      let userId = getCookie('client-user-id') || localStorage.getItem('client-user-id') || localStorage.getItem('supabase-user-id')
      
      if (!userId) {
        setError('User not authenticated')
        setLoading(false)
        return
      }

      console.log('Fetching AI & ML progress for user ID:', userId)

      // Fetch user's AI & ML progress
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('id, ai_ml_covered')
        .eq('id', userId)
        .single()

      if (profileError || !userProfile) {
        console.error('Failed to fetch user profile:', profileError)
        if (profileError?.code === 'PGRST116') {
          setError('User profile not found')
        } else {
          setError('Failed to load user profile: ' + (profileError?.message || 'Unknown error'))
        }
        setLoading(false)
        return
      }

      setProfile(userProfile)
      setLoading(false)

    } catch (err) {
      console.error('Profile load error:', err)
      setError('Failed to load profile: ' + (err instanceof Error ? err.message : 'Unknown error'))
      setLoading(false)
    }
  }

  const handleTopicClick = (topicId: number) => {
    if (isTopicAccessible(topicId)) {
      router.push(`/ai-ml/${topicId}`)
    }
  }

  const handleBack = () => {
    router.back()
  }

  // Group topics by category
  const topicsByCategory = aiMlTopics.reduce((acc, topic) => {
    if (!acc[topic.category]) {
      acc[topic.category] = []
    }
    acc[topic.category].push(topic)
    return acc
  }, {} as Record<string, AIMlTopic[]>)

  const categoryOrder = [
    'Introduction',
    'Mathematics',
    'Data Preparation', 
    'Core ML',
    'Model Evaluation',
    'Deep Learning',
    'Advanced ML',
    'AI Ethics & Interpretability',
    'MLOps',
    'AI Applications',
    'Emerging AI'
  ]

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
      // Auto-scroll to category after a brief delay for animation
      setTimeout(() => {
        const categoryElement = document.getElementById(`category-${category}`)
        if (categoryElement) {
          categoryElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
          })
        }
      }, 100)
    }
    setExpandedCategories(newExpanded)
  }

  // Auto-open the first incomplete category on load
  useEffect(() => {
    if (profile && expandedCategories.size === 0) {
      // Find the first category that has incomplete topics
      for (const category of categoryOrder) {
        const categoryTopics = topicsByCategory[category]
        if (categoryTopics) {
          const hasIncompleteTopics = categoryTopics.some(topic => !isTopicCompleted(topic.id))
          if (hasIncompleteTopics) {
            setExpandedCategories(new Set([category]))
            // Auto-scroll to the opened category
            setTimeout(() => {
              const categoryElement = document.getElementById(`category-${category}`)
              if (categoryElement) {
                categoryElement.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'start',
                  inline: 'nearest'
                })
              }
            }, 500)
            break
          }
        }
      }
    }
  }, [profile, topicsByCategory])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6 animate-pulse">🐱</div>
          <p className="font-mono text-gray-600">Loading your AI & ML journey...</p>
          <div className="mt-6 w-32 h-0.5 bg-gray-100 mx-auto overflow-hidden">
            <div className="h-full bg-black animate-pulse"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6 animate-bounce">🚫</div>
          <p className="font-mono text-red-400 mb-8">{error}</p>
          <div className="space-y-4">
            <button 
              onClick={handleBack}
              className="w-full py-4 bg-black text-white font-mono hover:bg-gray-800 transition-all duration-300"
            >
              Go Back
            </button>
            <button 
              onClick={loadUserProfile}
              className="w-full py-4 border border-gray-200 font-mono hover:border-black hover:bg-gray-50 transition-all duration-300"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-black font-mono">
      {/* Header */}
      <header className="border-b border-gray-100 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4">
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
            <h1 className="text-2xl font-light">AI & Machine Learning</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Progress</p>
              <p className="text-lg font-light">{profile?.ai_ml_covered || 0}/{TOTAL_TOPICS}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-2 pb-32">
        {/* Topics by Category with Dropdowns */}
        <div className="max-w-5xl mx-auto mt-8">
          {categoryOrder.map(category => {
            const categoryTopics = topicsByCategory[category]
            if (!categoryTopics) return null

            const completedInCategory = categoryTopics.filter(topic => isTopicCompleted(topic.id)).length
            const totalInCategory = categoryTopics.length
            const isExpanded = expandedCategories.has(category)

            return (
              <div key={category} className="mb-4" id={`category-${category}`}>
                {/* Category Header (Clickable Dropdown) */}
                <div 
                  onClick={() => toggleCategory(category)}
                  className="border border-gray-200 bg-white hover:bg-gray-50 transition-all duration-300 cursor-pointer"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-90' : 'rotate-0'}`}>
                          <div className="w-6 h-6 border border-gray-300 flex items-center justify-center text-xs">
                            →
                          </div>
                        </div>
                        <div>
                          <h2 className="text-lg font-light text-gray-800">{category}</h2>
                          <div className="text-sm text-gray-500 mt-1">
                            {completedInCategory}/{totalInCategory} topics completed
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-500 font-mono">
                          {Math.round((completedInCategory / totalInCategory) * 100)}%
                        </div>
                        <div className="w-24 bg-gray-100 h-2 overflow-hidden">
                          <div 
                            className="bg-black h-full transition-all duration-500 ease-out"
                            style={{ 
                              width: `${(completedInCategory / totalInCategory) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Category Topics Grid (Collapsible) */}
                <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="border-l border-r border-b border-gray-200 bg-gray-50 p-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {categoryTopics.map((topic) => {
                        const completed = isTopicCompleted(topic.id)
                        const accessible = isTopicAccessible(topic.id)
                        
                        return (
                          <div
                            key={topic.id}
                            onClick={() => handleTopicClick(topic.id)}
                            className={`
                              border-2 p-4 transition-all duration-300 cursor-pointer relative group
                              ${completed 
                                ? 'bg-white border-gray-200 hover:border-black hover:bg-gray-50' 
                                : accessible
                                ? 'bg-white border-gray-200 hover:border-black hover:bg-gray-50'
                                : 'bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed'
                              }
                            `}
                          >
                            <div className="flex flex-col items-center justify-center space-y-3 h-32">
                              <div className={`text-2xl transition-transform duration-300 ${accessible ? 'group-hover:scale-110' : 'opacity-50'}`}>
                                {topic.emoji}
                              </div>
                              <div className="text-center">
                                <h3 className={`font-mono text-xs font-medium leading-tight mb-1 ${!accessible ? 'opacity-50' : ''}`}>
                                  {topic.name}
                                </h3>
                                <p className={`text-xs leading-tight ${completed ? 'text-gray-500' : accessible ? 'text-gray-500' : 'text-gray-400'}`}>
                                  {topic.category}
                                </p>
                              </div>
                              <div className="text-xs text-gray-400">#{topic.id}</div>
                              
                              {completed && (
                                <div className="absolute top-2 right-2 text-xs text-green-600">✓</div>
                              )}
                              {!accessible && (
                                <div className="absolute top-2 left-2 text-xs opacity-50">🔒</div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Progress Section */}
        <div className="max-w-4xl mx-auto mt-16">
          <div className="bg-gray-50 border border-gray-200 p-8">
            <div className="text-center mb-6">
              <div className="text-3xl mb-4">{catAnimation}</div>
              <h3 className="font-mono text-lg mb-2">Your AI & ML Journey</h3>
              <p className="text-gray-600 text-sm">Master artificial intelligence and machine learning from fundamentals to cutting-edge!</p>
            </div>
            
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <span className="font-mono text-sm text-gray-500">Overall Progress</span>
                <span className="font-mono text-sm text-gray-600">
                  {profile?.ai_ml_covered || 0} / {TOTAL_TOPICS}
                </span>
              </div>
              <div className="w-full bg-gray-200 h-3 overflow-hidden">
                <div 
                  className="bg-black h-full transition-all duration-1000 ease-out"
                  style={{ 
                    width: `${((profile?.ai_ml_covered || 0) / TOTAL_TOPICS) * 100}%`
                  }}
                />
              </div>
              <div className="text-center mt-3">
                <span className="font-mono text-xs text-gray-500">
                  {Math.round(((profile?.ai_ml_covered || 0) / TOTAL_TOPICS) * 100)}% Complete
                </span>
              </div>
            </div>

            {/* Featured Categories */}
            <div className="grid grid-cols-4 gap-4 mt-8">
              <div className="text-center">
                <div className="text-2xl mb-2">📊</div>
                <div className="text-xs font-mono text-gray-600">Mathematics</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">🧠</div>
                <div className="text-xs font-mono text-gray-600">Deep Learning</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">⚙️</div>
                <div className="text-xs font-mono text-gray-600">MLOps</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">🚀</div>
                <div className="text-xs font-mono text-gray-600">Emerging AI</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer section */}
        <div className="text-center py-16 border-t border-gray-100 mt-12">
          <div className="max-w-2xl mx-auto">
            <div className="text-4xl mb-6">{catAnimation}</div>
            <p className="font-mono text-gray-500 mb-4">
              Ready to build the AI systems of tomorrow?
            </p>
            <div className="text-sm text-gray-400 font-mono">
              {profile?.ai_ml_covered || 0} topics mastered • {TOTAL_TOPICS - (profile?.ai_ml_covered || 0)} topics remaining
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
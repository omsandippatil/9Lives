'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { systemDesignTopics, SystemDesignTopic } from './system-design'

interface UserProfile {
  id: string
  system_design_covered: number
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

export default function SystemDesignPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [catAnimation, setCatAnimation] = useState('🐱')
  const router = useRouter()

  // Constants
  const TOTAL_TOPICS = systemDesignTopics.length

  // Helper function to check if a topic is completed
  const isTopicCompleted = (topicId: number): boolean => {
    if (!profile) return false
    return topicId <= profile.system_design_covered
  }

  // Helper function to check if a topic is accessible
  const isTopicAccessible = (topicId: number): boolean => {
    if (!profile) return false
    return topicId <= profile.system_design_covered + 1 // Current + 1 next topic is accessible
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

      console.log('Fetching system design progress for user ID:', userId)

      // Fetch user's system design progress
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('id, system_design_covered')
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
      router.push(`/system-design/${topicId}`)
    }
  }

  const handleBack = () => {
    router.back()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6 animate-pulse">🐱</div>
          <p className="font-mono text-gray-600">Loading your system design journey...</p>
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
            <h1 className="text-2xl font-light">System Design</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Progress</p>
              <p className="text-lg font-light">{profile?.system_design_covered || 0}/{TOTAL_TOPICS}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 pb-32">
        {/* Topics Grid */}
        <div className="max-w-7xl mx-auto mt-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {systemDesignTopics.map((topic) => {
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
                        {topic.company}
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

        {/* Progress Section */}
        <div className="max-w-4xl mx-auto mt-16">
          <div className="bg-gray-50 border border-gray-200 p-8">
            <div className="text-center mb-6">
              <div className="text-3xl mb-4">{catAnimation}</div>
              <h3 className="font-mono text-lg mb-2">Your System Design Journey</h3>
              <p className="text-gray-600 text-sm">Master the systems that power the world's biggest tech companies!</p>
            </div>
            
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <span className="font-mono text-sm text-gray-500">Overall Progress</span>
                <span className="font-mono text-sm text-gray-600">
                  {profile?.system_design_covered || 0} / {TOTAL_TOPICS}
                </span>
              </div>
              <div className="w-full bg-gray-200 h-3 overflow-hidden">
                <div 
                  className="bg-black h-full transition-all duration-1000 ease-out"
                  style={{ 
                    width: `${((profile?.system_design_covered || 0) / TOTAL_TOPICS) * 100}%`
                  }}
                />
              </div>
              <div className="text-center mt-3">
                <span className="font-mono text-xs text-gray-500">
                  {Math.round(((profile?.system_design_covered || 0) / TOTAL_TOPICS) * 100)}% Complete
                </span>
              </div>
            </div>

            {/* Featured Companies */}
            <div className="grid grid-cols-4 gap-4 mt-8">
              <div className="text-center">
                <div className="text-2xl mb-2">🔍</div>
                <div className="text-xs font-mono text-gray-600">Google</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">📱</div>
                <div className="text-xs font-mono text-gray-600">Meta</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">🛒</div>
                <div className="text-xs font-mono text-gray-600">Amazon</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">🎬</div>
                <div className="text-xs font-mono text-gray-600">Netflix</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer section */}
        <div className="text-center py-16 border-t border-gray-100 mt-12">
          <div className="max-w-2xl mx-auto">
            <div className="text-4xl mb-6">{catAnimation}</div>
            <p className="font-mono text-gray-500 mb-4">
              Ready to design systems that serve billions of users?
            </p>
            <div className="text-sm text-gray-400 font-mono">
              {profile?.system_design_covered || 0} systems mastered • {TOTAL_TOPICS - (profile?.system_design_covered || 0)} systems remaining
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
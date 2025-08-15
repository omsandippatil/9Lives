'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

interface UserProfile {
  id: string
  python_lang_covered: number
}

interface PythonTheory {
  id: number
  concept: string
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

export default function PythonTheoryPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [currentTopic, setCurrentTopic] = useState<PythonTheory | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nextTopicNumber, setNextTopicNumber] = useState<number>(0)
  const [catAnimation, setCatAnimation] = useState('🐱')
  const router = useRouter()

  // Cat animation cycle
  useEffect(() => {
    const cats = ['🐱', '😸', '😺', '😻', '🙀', '😽', '😼', '🐾']
    let index = 0
    
    const interval = setInterval(() => {
      index = (index + 1) % cats.length
      setCatAnimation(cats[index])
    }, 2000)
    
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    loadPythonTheoryData()
  }, [])

  const loadPythonTheoryData = async () => {
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

      console.log('Fetching Python theory data for user ID:', userId)

      // Fetch user's Python progress
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('id, python_lang_covered')
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
      
      // Calculate next topic number (current + 1)
      const nextTopicId = userProfile.python_lang_covered + 1
      setNextTopicNumber(nextTopicId)

      console.log('Current Python topics covered:', userProfile.python_lang_covered)
      console.log('Next topic ID to fetch:', nextTopicId)

      // Fetch the next Python theory topic
      const { data: pythonTheory, error: theoryError } = await supabase
        .from('python_lang_theory')
        .select('id, concept')
        .eq('id', nextTopicId)
        .single()

      if (theoryError) {
        console.error('Failed to fetch Python theory:', theoryError)
        if (theoryError?.code === 'PGRST116') {
          setError('No more Python topics available')
        } else {
          setError('Failed to load Python theory: ' + (theoryError?.message || 'Unknown error'))
        }
        setLoading(false)
        return
      }

      if (!pythonTheory) {
        setError('Python theory topic not found')
        setLoading(false)
        return
      }

      console.log('Python theory loaded successfully:', pythonTheory)
      setCurrentTopic(pythonTheory)
      setLoading(false)

    } catch (err) {
      console.error('Python theory load error:', err)
      setError('Failed to load Python theory: ' + (err instanceof Error ? err.message : 'Unknown error'))
      setLoading(false)
    }
  }

  const handleTopicClick = () => {
    if (currentTopic) {
      router.push(`/languages/python/${currentTopic.id}`)
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
          <p className="font-mono text-gray-600">Loading your Python journey...</p>
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
          <div className="text-6xl mb-6 animate-bounce">😿</div>
          <p className="font-mono text-red-400 mb-8">{error}</p>
          <div className="space-y-4">
            <button 
              onClick={handleBack}
              className="w-full py-4 bg-black text-white font-mono hover:bg-gray-800 transition-all duration-300"
            >
              Go Back
            </button>
            <button 
              onClick={loadPythonTheoryData}
              className="w-full py-4 border border-gray-200 font-mono hover:border-black hover:bg-gray-50 transition-all duration-300"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!profile || !currentTopic) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6">😾</div>
          <p className="font-mono text-gray-600 mb-6">No Python theory data available.</p>
          <button 
            onClick={loadPythonTheoryData}
            className="py-3 px-6 bg-black text-white font-mono hover:bg-gray-800 transition-colors"
          >
            Reload Data
          </button>
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
          
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-pulse">{catAnimation}</span>
            <h1 className="text-2xl font-light">Python Theory</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Progress</p>
              <p className="text-lg font-light">{profile.python_lang_covered}/50</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-[80vh] flex items-center justify-center px-4">
        {/* Single Card */}
        <div 
          onClick={handleTopicClick}
          className="group bg-white border-2 border-gray-100 hover:border-black cursor-pointer transition-all duration-500 ease-out hover:shadow-xl overflow-hidden max-w-2xl w-full"
        >
          <div className="p-8">
            {/* Cat Header */}
            <div className="text-center mb-6">
              <div className="text-6xl mb-4 transition-all duration-500">{catAnimation}</div>
              <h3 className="font-mono font-medium text-2xl mb-3">Topic #{nextTopicNumber}</h3>
              <p className="text-lg text-gray-600 mb-4">{currentTopic.concept}</p>
            </div>
            
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <span className="font-mono text-sm text-gray-400">Purr-ogress</span>
                <span className="font-mono text-sm text-gray-600">{profile.python_lang_covered}/50</span>
              </div>
              <div className="w-full bg-gray-50 h-3 overflow-hidden">
                <div 
                  className="bg-black h-full transition-all duration-700 ease-out"
                  style={{ width: `${Math.min((profile.python_lang_covered / 50) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Status */}
            <div className="text-center mb-6">
              <p className="font-mono text-base text-gray-600 mb-3">
                🐾 {profile.python_lang_covered} topics pounced • {50 - profile.python_lang_covered} to go
              </p>
              <div className="inline-flex items-center gap-3 text-gray-500 group-hover:text-black transition-colors">
                <span className="font-mono text-base">Ready to pounce</span>
                <span className="transform group-hover:translate-x-2 transition-transform duration-300 text-xl">→</span>
              </div>
            </div>

            {/* Action */}
            <div className="text-center">
              <div className="font-mono text-sm text-gray-400 mb-3">Click anywhere to start learning</div>
              <div className="text-2xl group-hover:animate-bounce">🐱</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
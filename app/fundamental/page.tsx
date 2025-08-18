'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

interface UserProfile {
  id: string
  fundamental_questions_attempted: number
}

interface FundamentalQuestion {
  id: number
  question: string
}

interface Topic {
  id: number
  topic_name: string
}

interface TopicProgress {
  topicNumber: number
  questionNumber: number
  totalQuestions: number
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

// Aesthetic emojis for topics
const topicEmojis = [
  '🚀', '💎', '⚡', '🔮', '🌟', '🎯', '🏆', '⭐', '💡', '🔥',
  '🎨', '🌈', '🦄', '👑', '💫', '🎪', '🎭', '🎨', '🌺', '🍃',
  '🌊', '⛰️', '🌙', '☀️', '🌸', '🦋', '🐾', '🎵', '🎪', '🎨',
  '🔭', '🧪', '⚙️', '🔬', '📡', '💻', '🖥️', '📱', '🔧', '⚡',
  '🎲', '🎯', '🎪', '🎨', '🌟', '💫', '🔮', '🚀', '💎', '⭐'
]

export default function FundamentalQuestionsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<FundamentalQuestion | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nextQuestionNumber, setNextQuestionNumber] = useState<number>(0)
  const [topicProgress, setTopicProgress] = useState<TopicProgress | null>(null)
  const [catAnimation, setCatAnimation] = useState('🐱')
  const [showAllTopics, setShowAllTopics] = useState(false)
  const [topics, setTopics] = useState<Topic[]>([])
  const [topicsLoading, setTopicsLoading] = useState(false)
  const router = useRouter()

  // Constants for topic structure
  const QUESTIONS_PER_TOPIC = 50
  const TOTAL_TOPICS = 50
  const TOTAL_QUESTIONS = TOTAL_TOPICS * QUESTIONS_PER_TOPIC // 2500

  // Helper function to calculate topic and question number from question ID
  const calculateTopicProgress = (questionId: number): TopicProgress => {
    const topicNumber = Math.ceil(questionId / QUESTIONS_PER_TOPIC)
    const questionNumber = ((questionId - 1) % QUESTIONS_PER_TOPIC) + 1
    return {
      topicNumber,
      questionNumber,
      totalQuestions: questionId
    }
  }

  // Helper function to check if a topic is completed
  const isTopicCompleted = (topicId: number): boolean => {
    if (!profile) return false
    const completedTopics = Math.floor(profile.fundamental_questions_attempted / QUESTIONS_PER_TOPIC)
    return topicId <= completedTopics
  }

  // Helper function to check if a topic is accessible
  const isTopicAccessible = (topicId: number): boolean => {
    if (!profile) return false
    const completedTopics = Math.floor(profile.fundamental_questions_attempted / QUESTIONS_PER_TOPIC)
    return topicId <= completedTopics + 1 // Current topic + 1 next topic is accessible
  }

  // Get random emoji for topic
  const getTopicEmoji = (topicId: number): string => {
    return topicEmojis[(topicId - 1) % topicEmojis.length]
  }

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
    loadFundamentalQuestionData()
  }, [])

  const loadFundamentalQuestionData = async () => {
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

      console.log('Fetching fundamental questions data for user ID:', userId)

      // Fetch user's fundamental questions progress
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('id, fundamental_questions_attempted')
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
      
      // Calculate next question number (current + 1)
      const nextQuestionId = userProfile.fundamental_questions_attempted + 1
      setNextQuestionNumber(nextQuestionId)

      // Calculate topic progress
      const progress = calculateTopicProgress(nextQuestionId)
      setTopicProgress(progress)

      console.log('Current fundamental questions attempted:', userProfile.fundamental_questions_attempted)
      console.log('Next question ID to fetch:', nextQuestionId)

      // Fetch the next fundamental question
      const { data: fundamentalQuestion, error: questionError } = await supabase
        .from('fundamental_questions')
        .select('id, question')
        .eq('id', nextQuestionId)
        .single()

      if (questionError) {
        console.error('Failed to fetch fundamental question:', questionError)
        if (questionError?.code === 'PGRST116') {
          setError('No more fundamental questions available')
        } else {
          setError('Failed to load fundamental question: ' + (questionError?.message || 'Unknown error'))
        }
        setLoading(false)
        return
      }

      if (!fundamentalQuestion) {
        setError('Fundamental question not found')
        setLoading(false)
        return
      }

      console.log('Fundamental question loaded successfully:', fundamentalQuestion)
      setCurrentQuestion(fundamentalQuestion)
      setLoading(false)

    } catch (err) {
      console.error('Fundamental question load error:', err)
      setError('Failed to load fundamental question: ' + (err instanceof Error ? err.message : 'Unknown error'))
      setLoading(false)
    }
  }

  const loadAllTopics = async () => {
    if (!supabase) {
      setError('Database connection not available')
      return
    }

    setTopicsLoading(true)
    try {
      const { data: topicsData, error: topicsError } = await supabase
        .from('fundaq_topics')
        .select('id, topic_name')
        .order('id')

      if (topicsError) {
        console.error('Failed to fetch topics:', topicsError)
        setError('Failed to load topics: ' + topicsError.message)
        setTopicsLoading(false)
        return
      }

      setTopics(topicsData || [])
      setShowAllTopics(true)
      setTopicsLoading(false)
    } catch (err) {
      console.error('Topics load error:', err)
      setError('Failed to load topics: ' + (err instanceof Error ? err.message : 'Unknown error'))
      setTopicsLoading(false)
    }
  }

  const handleQuestionClick = () => {
    if (currentQuestion) {
      router.push(`/fundamental/${currentQuestion.id}`)
    }
  }

  const handleTopicClick = (topicId: number) => {
    if (isTopicAccessible(topicId)) {
      router.push(`/fundamental/list/${topicId}`)
    }
  }

  const handleBack = () => {
    router.back()
  }

  const handleViewAllTopics = () => {
    if (!showAllTopics) {
      loadAllTopics()
    } else {
      setShowAllTopics(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6 animate-pulse">🐱</div>
          <p className="font-mono text-gray-600">Loading your fundamental challenge...</p>
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
              onClick={loadFundamentalQuestionData}
              className="w-full py-4 border border-gray-200 font-mono hover:border-black hover:bg-gray-50 transition-all duration-300"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!profile || !currentQuestion) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6">😾</div>
          <p className="font-mono text-gray-600 mb-6">No fundamental questions available.</p>
          <button 
            onClick={loadFundamentalQuestionData}
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
            <h1 className="text-2xl font-light">Fundamental Questions</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Topics</p>
              <p className="text-lg font-light">{topicProgress ? topicProgress.topicNumber : 1}/{TOTAL_TOPICS}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 pb-32">
        {/* Single Card - Centered */}
        <div className="min-h-[60vh] flex flex-col items-center justify-center">
          <div 
            onClick={handleQuestionClick}
            className="group bg-white border-2 border-gray-100 hover:border-black cursor-pointer transition-all duration-500 ease-out hover:shadow-xl overflow-hidden max-w-4xl w-full mb-8"
          >
            <div className="p-8">
              {/* Cat Header */}
              <div className="text-center mb-6">
                <div className="text-6xl mb-4 transition-all duration-500">{catAnimation}</div>
                <div className="text-xl text-gray-600 mb-4 max-w-3xl mx-auto leading-relaxed">
                  {currentQuestion.question}
                </div>
                {topicProgress && (
                  <>
                    <h3 className="font-mono font-medium text-lg mb-1">
                      Topic {topicProgress.topicNumber} • Question {topicProgress.questionNumber}
                    </h3>
                    <p className="text-xs text-gray-500 mb-3 font-mono">
                      Question #{nextQuestionNumber} of {TOTAL_QUESTIONS}
                    </p>
                  </>
                )}
              </div>
              
              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-mono text-sm text-gray-400">Topic Progress</span>
                  <span className="font-mono text-sm text-gray-600">
                    {topicProgress ? `${topicProgress.questionNumber - 1}/${QUESTIONS_PER_TOPIC}` : '0/50'}
                  </span>
                </div>
                <div className="w-full bg-gray-50 h-3 overflow-hidden">
                  <div 
                    className="bg-black h-full transition-all duration-700 ease-out"
                    style={{ 
                      width: topicProgress 
                        ? `${Math.min(((topicProgress.questionNumber - 1) / QUESTIONS_PER_TOPIC) * 100, 100)}%`
                        : '0%'
                    }}
                  />
                </div>
              </div>

              {/* Status */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-3 text-gray-500 group-hover:text-black transition-colors">
                  <span className="font-mono text-base">Ready to pounce</span>
                  <span className="transform group-hover:translate-x-2 transition-transform duration-300 text-xl">→</span>
                </div>
              </div>

              {/* Action */}
              <div className="text-center">
                <div className="font-mono text-sm text-gray-400 mb-3">Click anywhere to start pouncing</div>
                <div className="text-2xl group-hover:animate-bounce">🐱</div>
              </div>
            </div>
          </div>
        </div>

        {/* Topics Section */}
        <div className="max-w-7xl mx-auto">
          {/* View All Topics Text */}
          <div className="text-center mb-12">
            <span
              onClick={handleViewAllTopics}
              className="font-mono text-lg text-gray-600 hover:text-black cursor-pointer underline underline-offset-4 hover:underline-offset-8 transition-all duration-300 inline-flex items-center gap-2"
            >
              {showAllTopics ? 'Hide All Topics' : 'View All Topics'}
              <span className={`transform transition-transform duration-300 ${showAllTopics ? 'rotate-180' : ''}`}>
                ↓
              </span>
            </span>
          </div>

          {/* Topics Grid */}
          {showAllTopics && (
            <div className="w-full mb-20">
              {topicsLoading ? (
                // Skeleton Loading
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {Array.from({ length: 20 }, (_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="bg-gray-100 border border-gray-200 p-6 h-32">
                        <div className="flex flex-col items-center justify-center h-full space-y-3">
                          <div className="w-8 h-8 bg-gray-200 rounded"></div>
                          <div className="w-20 h-4 bg-gray-200 rounded"></div>
                          <div className="w-12 h-3 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Topics Grid
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {topics.map((topic) => {
                    const completed = isTopicCompleted(topic.id)
                    const accessible = isTopicAccessible(topic.id)
                    
                    return (
                      <div
                        key={topic.id}
                        onClick={() => handleTopicClick(topic.id)}
                        className={`
                          border-2 p-6 transition-all duration-300 cursor-pointer relative
                          ${completed 
                            ? 'bg-black text-white border-black hover:bg-gray-800' 
                            : accessible
                            ? 'bg-white border-gray-200 hover:border-black hover:bg-gray-50'
                            : 'bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed'
                          }
                        `}
                      >
                        <div className="flex flex-col items-center justify-center space-y-3 h-20">
                          <div className={`text-2xl ${!accessible ? 'opacity-50' : ''}`}>
                            {getTopicEmoji(topic.id)}
                          </div>
                          <div className="text-center">
                            <h3 className={`font-mono text-sm font-medium line-clamp-2 ${!accessible ? 'opacity-50' : ''}`}>
                              {topic.topic_name}
                            </h3>
                            <p className={`text-xs mt-1 ${completed ? 'text-gray-300' : accessible ? 'text-gray-500' : 'text-gray-400'}`}>
                              Topic {topic.id}
                            </p>
                          </div>
                          {completed && (
                            <div className="absolute top-2 right-2 text-xs">✓</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Footer section for better visual completion */}
          <div className="text-center py-16 border-t border-gray-100 mt-12">
            <div className="max-w-2xl mx-auto">
              <div className="text-4xl mb-6">{catAnimation}</div>
              <p className="font-mono text-gray-500 mb-4">
                Keep pouncing on those fundamental challenges!
              </p>
              <div className="text-sm text-gray-400 font-mono">
                Progress: {profile?.fundamental_questions_attempted || 0} / {TOTAL_QUESTIONS} questions completed
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
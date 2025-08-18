'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

interface UserProfile {
  id: string
  technical_questions_attempted: number
}

interface TechnicalQuestion {
  id: number
  question: string
}

interface Topic {
  id: number
  topic_name: string
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



export default function TopicQuestionsPage() {
  const router = useRouter()
  const params = useParams()
  const topicId = parseInt(params.id as string)

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [topic, setTopic] = useState<Topic | null>(null)
  const [questions, setQuestions] = useState<TechnicalQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState(0)
  const [catAnimation, setCatAnimation] = useState('🐱')

  // Constants
  const QUESTIONS_PER_TOPIC = 50
  const QUESTIONS_PER_TAB = 10
  const TABS_PER_TOPIC = QUESTIONS_PER_TOPIC / QUESTIONS_PER_TAB // 5 tabs

  // Calculate question range for this topic
  const getQuestionRange = (topicId: number) => {
    const startId = (topicId - 1) * QUESTIONS_PER_TOPIC + 1
    const endId = topicId * QUESTIONS_PER_TOPIC
    return { startId, endId }
  }

  // Get questions for specific tab
  const getQuestionsForTab = (tabIndex: number) => {
    const startIndex = tabIndex * QUESTIONS_PER_TAB
    const endIndex = startIndex + QUESTIONS_PER_TAB
    return questions.slice(startIndex, endIndex)
  }

  // Get relative question number (1-50 within topic)
  const getRelativeQuestionNumber = (actualQuestionId: number): number => {
    const { startId } = getQuestionRange(topicId)
    return actualQuestionId - startId + 1
  }

  // Check if question is accessible based on user progress
  const isQuestionAccessible = (questionId: number): boolean => {
    if (!profile) return false
    return questionId <= profile.technical_questions_attempted + 1
  }

  // Check if question is completed
  const isQuestionCompleted = (questionId: number): boolean => {
    if (!profile) return false
    return questionId <= profile.technical_questions_attempted
  }

  // Get topic emoji
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
    if (topicId) {
      loadTopicData()
    }
  }, [topicId])

  const loadTopicData = async () => {
    try {
      if (!supabase) {
        setError('Database connection not available')
        setLoading(false)
        return
      }

      // Get user ID
      let userId = getCookie('client-user-id') || localStorage.getItem('client-user-id') || localStorage.getItem('supabase-user-id')
      
      if (!userId) {
        setError('User not authenticated')
        setLoading(false)
        return
      }

      console.log('Loading topic data for topic ID:', topicId)

      // Fetch user profile
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('id, technical_questions_attempted')
        .eq('id', userId)
        .single()

      if (profileError || !userProfile) {
        console.error('Failed to fetch user profile:', profileError)
        setError('Failed to load user profile')
        setLoading(false)
        return
      }

      setProfile(userProfile)

      // Fetch topic info
      const { data: topicData, error: topicError } = await supabase
        .from('techq_topics')
        .select('id, topic_name')
        .eq('id', topicId)
        .single()

      if (topicError || !topicData) {
        console.error('Failed to fetch topic:', topicError)
        setError('Topic not found')
        setLoading(false)
        return
      }

      setTopic(topicData)

      // Calculate question range for this topic
      const { startId, endId } = getQuestionRange(topicId)
      console.log(`Fetching questions ${startId} to ${endId}`)

      // Fetch questions for this topic
      const { data: questionsData, error: questionsError } = await supabase
        .from('technical_questions')
        .select('id, question')
        .gte('id', startId)
        .lte('id', endId)
        .order('id')

      if (questionsError) {
        console.error('Failed to fetch questions:', questionsError)
        setError('Failed to load questions')
        setLoading(false)
        return
      }

      console.log(`Loaded ${questionsData?.length || 0} questions`)
      setQuestions(questionsData || [])
      setLoading(false)

    } catch (err) {
      console.error('Topic data load error:', err)
      setError('Failed to load topic data: ' + (err instanceof Error ? err.message : 'Unknown error'))
      setLoading(false)
    }
  }

  const handleQuestionClick = (questionId: number) => {
    if (isQuestionAccessible(questionId)) {
      router.push(`/technical/${questionId}`)
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
          <p className="font-mono text-gray-600">Loading topic questions...</p>
          <div className="mt-6 w-32 h-0.5 bg-gray-100 mx-auto overflow-hidden">
            <div className="h-full bg-gray-300 animate-pulse"></div>
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
              className="w-full py-4 bg-gray-900 text-white font-mono hover:bg-gray-700 transition-all duration-300"
            >
              Go Back
            </button>
            <button 
              onClick={loadTopicData}
              className="w-full py-4 border border-gray-200 font-mono hover:border-gray-400 hover:bg-gray-50 transition-all duration-300"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!topic || questions.length === 0) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6">😾</div>
          <p className="font-mono text-gray-600 mb-6">No questions found for this topic.</p>
          <button 
            onClick={handleBack}
            className="py-3 px-6 bg-gray-900 text-white font-mono hover:bg-gray-700 transition-colors"
          >
            Go Back
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
            <span className="text-2xl">{getTopicEmoji(topicId)}</span>
            <div className="text-center">
              <h1 className="text-2xl font-light">{topic.topic_name}</h1>
              <p className="text-sm text-gray-500">Topic {topicId}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Questions</p>
              <p className="text-lg font-light">{questions.length}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 pb-32">
        <div className="max-w-7xl mx-auto py-8">
          
          {/* Topic Info */}
          <div className="text-center mb-12">
            <div className="text-4xl mb-4">{catAnimation}</div>
            <h2 className="text-3xl font-light mb-2">{topic.topic_name}</h2>
            <p className="text-gray-600 font-mono">
              {questions.length} questions • Topic {topicId}
            </p>
          </div>

          {/* Tabs */}
          <div className="mb-8">
            <div className="flex flex-wrap justify-center gap-2 border-b border-gray-100">
              {Array.from({ length: TABS_PER_TOPIC }, (_, index) => {
                const tabQuestions = getQuestionsForTab(index)
                const startNum = index * QUESTIONS_PER_TAB + 1
                const endNum = Math.min((index + 1) * QUESTIONS_PER_TAB, questions.length)
                const hasAccessibleQuestions = tabQuestions.some(q => isQuestionAccessible(q.id))
                const completedCount = tabQuestions.filter(q => isQuestionCompleted(q.id)).length
                
                return (
                  <button
                    key={index}
                    onClick={() => setActiveTab(index)}
                    className={`
                      px-6 py-3 font-mono text-sm transition-all duration-300 border-b-2 relative
                      ${activeTab === index 
                        ? 'border-gray-400 text-gray-900 bg-gray-50' 
                        : hasAccessibleQuestions
                        ? 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-200'
                        : 'border-transparent text-gray-400 cursor-not-allowed'
                      }
                    `}
                    disabled={!hasAccessibleQuestions}
                  >
                    <span className="block">
                      Questions {startNum}-{endNum}
                    </span>
                    {completedCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 text-white text-xs rounded-full flex items-center justify-center">
                        {completedCount}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Questions List */}
          <div className="space-y-3 mb-20">
            {getQuestionsForTab(activeTab).map((question) => {
              const relativeQuestionNumber = getRelativeQuestionNumber(question.id)
              const accessible = isQuestionAccessible(question.id)
              const completed = isQuestionCompleted(question.id)
              const isCurrent = question.id === (profile?.technical_questions_attempted || 0) + 1

              return (
                <div
                  key={question.id}
                  onClick={() => handleQuestionClick(question.id)}
                  className={`
                    group border border-gray-200 p-6 transition-all duration-300 hover:shadow-sm
                    ${accessible
                      ? 'hover:border-gray-400 cursor-pointer'
                      : 'opacity-60 cursor-not-allowed'
                    }
                    ${isCurrent ? 'border-blue-300 bg-blue-50' : ''}
                    ${completed ? 'bg-green-50 border-green-200' : ''}
                  `}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className={`
                        w-10 h-10 border border-gray-300 flex items-center justify-center font-mono text-sm font-medium rounded
                        ${completed ? 'bg-green-100 border-green-300 text-green-700' : ''}
                      `}>
                        {completed ? '✓' : relativeQuestionNumber}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-lg leading-relaxed mb-2 text-gray-800">
                        {question.question}
                      </p>
                      
                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-mono text-gray-500">
                          Question {relativeQuestionNumber} of {QUESTIONS_PER_TOPIC}
                        </span>
                        
                        {completed && (
                          <span className="text-green-600 font-mono text-xs bg-green-100 px-2 py-1 rounded">
                            Completed
                          </span>
                        )}
                        
                        {isCurrent && (
                          <span className="text-blue-600 font-mono text-xs bg-blue-100 px-2 py-1 rounded">
                            Next Question
                          </span>
                        )}

                        {!accessible && (
                          <span className="text-gray-400 font-mono text-xs">
                            Locked
                          </span>
                        )}
                      </div>
                    </div>

                    {accessible && (
                      <div className="flex-shrink-0 transform transition-transform duration-300 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1">
                        →
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="text-center py-16 border-t border-gray-100">
            <div className="max-w-2xl mx-auto">
              <div className="text-4xl mb-6">{getTopicEmoji(topicId)}</div>
              <p className="font-mono text-gray-500 mb-4">
                Topic {topicId}: {topic.topic_name}
              </p>
              <div className="text-sm text-gray-400 font-mono">
                {questions.filter(q => isQuestionCompleted(q.id)).length} of {questions.length} questions completed
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
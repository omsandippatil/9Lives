import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import 'katex/dist/katex.min.css'
import ExplanationPopup from './Popup'
// import { useRouter } from 'next/router' // Commented out to avoid router mounting issues

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Extend the Window interface to include our custom _gifCache property
declare global {
  interface Window {
    _gifCache?: { [key: string]: string }
  }
}

interface QuestionData {
  id: number
  question: string
  formula_or_logic: string
  options: string[]
  explanation: string
  tags: string[]
}

interface QuestionComponentProps {
  questionData: QuestionData
  questionId: number
  onNext?: (nextQuestionId: number) => void // Optional callback for navigation
}

interface UserProfile {
  id: string
  email: string
  aptitude_questions_attempted: number
  current_streak: [string, number] | null
  total_points: number
  created_at: string
  updated_at: string
}

// Enhanced GIF caching utility
const GifCache = {
  getCache: () => {
    if (typeof window === 'undefined') return null
    if (!window._gifCache) {
      window._gifCache = {}
    }
    return window._gifCache
  },

  async loadGif(url: string, fallbackUrl?: string): Promise<{ src: string, isCached: boolean }> {
    const cache = GifCache.getCache()
    if (!cache) return { src: url, isCached: false }

    const cacheKey = url.split('/').pop() || url
    
    // Check if already cached
    if (cache[cacheKey]) {
      return { src: cache[cacheKey], isCached: true }
    }

    try {
      // Try to fetch the GIF
      const response = await fetch(fallbackUrl || url)
      if (!response.ok) throw new Error('Failed to fetch')
      
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      
      // Cache it globally
      cache[cacheKey] = objectUrl
      
      return { src: objectUrl, isCached: false }
    } catch (error) {
      console.error('Failed to cache GIF:', error)
      return { src: url, isCached: false }
    }
  },

  // Preload both GIFs
  async preloadGifs(): Promise<{ happy: { src: string, isCached: boolean } | null, sad: { src: string, isCached: boolean } | null }> {
    const happyGifUrl = 'https://jfxihkyidrxhdyvdygnt.supabase.co/storage/v1/object/public/gifs/happy-dance.gif'
    const sadGifUrl = 'https://jfxihkyidrxhdyvdygnt.supabase.co/storage/v1/object/public/gifs/cry.gif'
    
    const [happy, sad] = await Promise.allSettled([
      GifCache.loadGif(happyGifUrl),
      GifCache.loadGif(sadGifUrl)
    ])

    return {
      happy: happy.status === 'fulfilled' ? happy.value : null,
      sad: sad.status === 'fulfilled' ? sad.value : null
    }
  }
}

// Confetti effect
const createConfetti = () => {
  const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8']
  const confettiCount = 150
  const duration = 3000

  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div')
    confetti.style.position = 'fixed'
    confetti.style.left = Math.random() * 100 + 'vw'
    confetti.style.top = '-10px'
    confetti.style.width = Math.random() * 10 + 5 + 'px'
    confetti.style.height = confetti.style.width
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]
    confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0%'
    confetti.style.pointerEvents = 'none'
    confetti.style.zIndex = '9999'
    confetti.style.transform = `rotate(${Math.random() * 360}deg)`
    
    document.body.appendChild(confetti)

    const animation = confetti.animate([
      {
        transform: `translateY(0) rotate(${Math.random() * 360}deg)`,
        opacity: 1
      },
      {
        transform: `translateY(100vh) rotate(${Math.random() * 720 + 360}deg)`,
        opacity: 0
      }
    ], {
      duration: Math.random() * 2000 + 2000,
      easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
    })

    animation.onfinish = () => {
      if (confetti.parentNode) {
        confetti.parentNode.removeChild(confetti)
      }
    }
  }
}

// Function to preprocess mathematical expressions
const preprocessMathContent = (content: string): string => {
  if (!content) return content

  // Handle inline math expressions - fix common LaTeX syntax issues
  let processed = content
    // Fix double backslashes in LaTeX expressions
    .replace(/\$\$(.*?)\$\$/g, (match, mathContent) => {
      // Clean up the math content
      let cleanMath = mathContent
        .replace(/\\{2,}/g, '\\') // Replace multiple backslashes with single
        .replace(/\\text\s*{\s*/g, '\\text{') // Fix text spacing
        .replace(/\s*}\s*/g, '}') // Clean up closing braces
        .replace(/div/g, '\\div') // Convert div to proper LaTeX
        .replace(/sqrt(\d+)/g, '\\sqrt{$1}') // Fix sqrt notation
        .replace(/\\%/g, '\\%') // Ensure percent signs are escaped
      
      return `$$${cleanMath}$$`
    })
    // Handle inline math
    .replace(/\$(.*?)\$/g, (match, mathContent) => {
      let cleanMath = mathContent
        .replace(/\\{2,}/g, '\\')
        .replace(/div/g, '\\div')
        .replace(/sqrt(\d+)/g, '\\sqrt{$1}')
      
      return `$${cleanMath}$`
    })

  // Handle common mathematical expressions that might not be wrapped in $ signs
  processed = processed
    // Wrap mathematical expressions with proper LaTeX
    .replace(/(\d+)\\?%\s*of\s*(\d+)/g, '$1\\% \\text{ of } $2')
    // Fix sqrt expressions without proper LaTeX
    .replace(/sqrt\s*(\d+)/g, '\\sqrt{$1}')
    // Fix division notation
    .replace(/(\d+)\s*div\s*(\d+)/g, '$1 \\div $2')
    // Ensure mathematical operations are properly spaced
    .replace(/(\d+)\s*\+\s*(\d+)/g, '$1 + $2')
    .replace(/(\d+)\s*-\s*(\d+)/g, '$1 - $2')
    .replace(/(\d+)\s*\*\s*(\d+)/g, '$1 \\times $2')

  return processed
}

// Custom components for ReactMarkdown
const MarkdownComponents = {
  p: ({ children, ...props }: any) => (
    <p className="mb-4 text-sm text-gray-700 leading-relaxed" {...props}>{children}</p>
  ),
  strong: ({ children, ...props }: any) => (
    <strong className="font-semibold text-gray-900" {...props}>{children}</strong>
  ),
  em: ({ children, ...props }: any) => (
    <em className="italic text-gray-800" {...props}>{children}</em>
  ),
  code: ({ children, className, inline, ...props }: any) => {
    if (inline) {
      return (
        <code className="inline-block bg-gray-100 text-gray-800 px-2 py-1 border mx-1 font-mono text-sm rounded" {...props}>
          {children}
        </code>
      )
    }
    return (
      <code className="block bg-gray-100 text-gray-800 p-3 border font-mono text-sm rounded" {...props}>
        {children}
      </code>
    )
  },
  pre: ({ children, ...props }: any) => (
    <pre className="bg-gray-100 text-gray-800 p-3 border font-mono text-sm rounded overflow-x-auto" {...props}>
      {children}
    </pre>
  ),
  h1: ({ children, ...props }: any) => (
    <h1 className="text-xl font-bold text-gray-900 mb-4" {...props}>{children}</h1>
  ),
  h2: ({ children, ...props }: any) => (
    <h2 className="text-lg font-semibold text-gray-900 mb-3" {...props}>{children}</h2>
  ),
  h3: ({ children, ...props }: any) => (
    <h3 className="text-base font-medium text-gray-900 mb-2" {...props}>{children}</h3>
  ),
  ul: ({ children, ...props }: any) => (
    <ul className="list-disc list-inside mb-4 text-sm text-gray-700" {...props}>{children}</ul>
  ),
  ol: ({ children, ...props }: any) => (
    <ol className="list-decimal list-inside mb-4 text-sm text-gray-700" {...props}>{children}</ol>
  ),
  li: ({ children, ...props }: any) => (
    <li className="mb-1" {...props}>{children}</li>
  ),
  blockquote: ({ children, ...props }: any) => (
    <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 mb-4" {...props}>
      {children}
    </blockquote>
  ),
  table: ({ children, ...props }: any) => (
    <table className="min-w-full border-collapse border border-gray-300 mb-4" {...props}>
      {children}
    </table>
  ),
  th: ({ children, ...props }: any) => (
    <th className="border border-gray-300 px-3 py-2 bg-gray-100 font-medium text-left" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }: any) => (
    <td className="border border-gray-300 px-3 py-2" {...props}>{children}</td>
  )
}

// Content renderer component with math preprocessing
const ContentRenderer = ({ content }: { content: string }) => {
  if (!content) return null

  // Preprocess the content to fix mathematical expressions
  const processedContent = preprocessMathContent(content)

  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={MarkdownComponents}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  )
}

export default function QuestionComponent({ questionData, questionId, onNext }: QuestionComponentProps) {
  // const router = useRouter() // Commented out to avoid router mounting issues
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [showAnimation, setShowAnimation] = useState(false)
  const [timeLeft, setTimeLeft] = useState(120) // 2 minutes
  const [isTimeUp, setIsTimeUp] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [preloadedGifs, setPreloadedGifs] = useState<{ happy: { src: string, isCached: boolean } | null, sad: { src: string, isCached: boolean } | null }>({ happy: null, sad: null })
  const [lastClickTime, setLastClickTime] = useState<{ [key: number]: number }>({})

  // Shuffle options while tracking correct answer
  const { shuffledOptions, correctIndex } = useMemo(() => {
    const correctAnswer = questionData.options[0] // First option is always correct
    const shuffled = [...questionData.options].sort(() => Math.random() - 0.5)
    const correctIdx = shuffled.indexOf(correctAnswer)
    
    return {
      shuffledOptions: shuffled,
      correctIndex: correctIdx
    }
  }, [questionData.options])

  // Determine if this is a new question based on aptitude_questions_attempted
  const isNewQuestion = useMemo(() => {
    if (!profile || profileLoading) return false
    
    const attemptedQuestions = profile.aptitude_questions_attempted || 0
    
    // New question if current questionId is exactly one more than attempted count
    return questionId === attemptedQuestions + 1
  }, [profile, profileLoading, questionId])

  // Preload GIFs on component mount
  useEffect(() => {
    const loadGifs = async () => {
      const gifs = await GifCache.preloadGifs()
      setPreloadedGifs(gifs)
    }
    loadGifs()
  }, [])

  // Fetch profile on component mount
  useEffect(() => {
    fetchProfile()
  }, [])

  // Timer effect - stop after submission
  useEffect(() => {
    // Only run timer if time is left, not submitted, and not showing explanation
    if (timeLeft > 0 && !hasSubmitted && !showExplanation) {
      const timer = setTimeout(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            // Time is up but don't force submit - just mark time up
            setIsTimeUp(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [timeLeft, hasSubmitted, showExplanation])

  // Reset states when question changes
  useEffect(() => {
    setSelectedOption(null)
    setShowExplanation(false)
    setShowHint(false)
    setTimeLeft(120)
    setIsTimeUp(false)
    setHasSubmitted(false)
    setLastClickTime({})
  }, [questionId])

  const fetchProfile = async () => {
    setProfileLoading(true)
    try {
      // First get the user profile from your existing API to get the user ID
      const response = await fetch('/api/auth/profile', {
        credentials: 'include'
      })
      
      if (!response.ok) {
        console.error('Failed to fetch profile from API:', response.status)
        return
      }

      const apiData = await response.json()
      if (!apiData.profile || !apiData.profile.id) {
        console.error('No profile or user ID received from API')
        return
      }

      const userId = apiData.profile.id

      // Now fetch the full profile data directly from Supabase users table
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('id, email, aptitude_questions_attempted, current_streak, total_points, created_at, updated_at')
        .eq('id', userId)
        .single()

      if (profileError) {
        console.error('Error fetching profile from users table:', profileError)
        return
      }

      if (profileData) {
        setProfile(profileData)
      } else {
        console.error('No profile data found in users table')
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setProfileLoading(false)
    }
  }

  const updateAptitudeProgress = async (): Promise<boolean> => {
    // Only update progress for new questions
    if (!isNewQuestion || !profile) {
      return false
    }
    
    try {
      const newAttemptedCount = (profile.aptitude_questions_attempted || 0) + 1
      
      const { data, error } = await supabase
        .from('users')
        .update({ aptitude_questions_attempted: newAttemptedCount })
        .eq('id', profile.id)
        .select('aptitude_questions_attempted')
        .single()
      
      if (error) {
        console.error('Error updating aptitude progress:', error)
        return false
      }

      if (data) {
        // Update the profile state with new attempted count
        setProfile(prev => prev ? {
          ...prev,
          aptitude_questions_attempted: data.aptitude_questions_attempted
        } : null)
        
        return true
      }
    } catch (error) {
      console.error('Error updating aptitude progress:', error)
    }
    return false
  }

  const awardPoints = async (points: number): Promise<boolean> => {
    if (!profile) return false
    
    try {
      const newTotalPoints = (profile.total_points || 0) + points
      
      const { data, error } = await supabase
        .from('users')
        .update({ total_points: newTotalPoints })
        .eq('id', profile.id)
        .select('total_points')
        .single()
      
      if (error) {
        console.error('Error awarding points:', error)
        return false
      }

      if (data) {
        // Update profile with new points total
        setProfile(prev => prev ? { 
          ...prev, 
          total_points: data.total_points 
        } : null)
        
        // Show animation
        setShowAnimation(true)
        setTimeout(() => setShowAnimation(false), 2000)
        
        return true
      }
    } catch (error) {
      console.error('Error awarding points:', error)
    }
    return false
  }

  const calculatePoints = (isCorrect: boolean, timeRemaining: number, isTimeUp: boolean): number => {
    // Award points for correct answers on new questions
    // Full points if answered within time, reduced points if time up
    if (!isCorrect || !isNewQuestion) {
      return 0
    }
    
    if (isTimeUp) {
      return 2 // Reduced points for correct answer after time up
    }
    
    return 5 // Full points for correct answer within time
  }

  const handleOptionClick = (index: number) => {
    if (showExplanation) return

    const currentTime = Date.now()
    const lastClick = lastClickTime[index] || 0
    
    // Check for double click (within 500ms)
    if (currentTime - lastClick < 500) {
      // Double click - auto submit
      setSelectedOption(index)
      setTimeout(() => handleSubmit(), 100) // Small delay to show selection
    } else {
      // Single click - just select
      setSelectedOption(index)
    }
    
    setLastClickTime(prev => ({ ...prev, [index]: currentTime }))
  }

  const handleCloseExplanation = () => {
    setShowExplanation(false)
  }

  const handleSubmit = async () => {
    // Prevent multiple submissions
    if (hasSubmitted || showExplanation) {
      return
    }
    
    if (selectedOption === null) {
      return
    }
    
    // Mark as submitted immediately to prevent race conditions
    setHasSubmitted(true)

    const isCorrect = selectedOption === correctIndex
    const pointsToAward = calculatePoints(isCorrect, timeLeft, isTimeUp)
    
    // Show confetti for correct answers on new questions
    if (isCorrect && isNewQuestion) {
      createConfetti()
    }
    
    // Award points if eligible
    if (pointsToAward > 0) {
      await awardPoints(pointsToAward)
    }

    // Update progress for new questions (regardless of correctness)
    await updateAptitudeProgress()
    
    // Show explanation
    setShowExplanation(true)
  }

  const handleNext = () => {
    // Navigate to next question using callback or fallback methods
    const nextQuestionId = questionId + 1
    
    if (onNext) {
      // Use provided callback for navigation
      onNext(nextQuestionId)
    } else {
      // Fallback: try different navigation methods
      if (typeof window !== 'undefined') {
        // Method 1: Try Next.js router if available
        try {
          const { useRouter } = require('next/router')
          const router = useRouter()
          router.push(`/aptitude/${nextQuestionId}`)
          return
        } catch (error) {
          console.log('Next.js router not available, using fallback navigation')
        }
        
        // Method 2: Use window.location as fallback
        try {
          window.location.href = `/aptitude/${nextQuestionId}`
        } catch (error) {
          console.error('Navigation failed:', error)
          alert(`Please navigate to question ${nextQuestionId} manually`)
        }
      }
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getStreakDisplay = (currentStreak: [string, number] | null) => {
    if (!currentStreak || !Array.isArray(currentStreak) || currentStreak.length < 2) {
      return { text: '0', isToday: false }
    }
    
    const [dateStr, streakValue] = currentStreak
    const today = new Date().toDateString()
    const yesterday = new Date(Date.now() - 86400000).toDateString()
    const streakDate = new Date(dateStr).toDateString()
    
    if (streakDate === today) {
      return { text: `${streakValue}`, isToday: true }
    } else if (streakDate === yesterday) {
      return { text: `${streakValue}`, isToday: false }
    } else {
      return { text: '0', isToday: false }
    }
  }

  const streakData = getStreakDisplay(profile?.current_streak || null)

  // Get status message for user feedback
  const getQuestionStatus = () => {
    if (profileLoading) return null
    if (!profile) return null
    
    const attempted = profile.aptitude_questions_attempted || 0
    
    if (questionId <= attempted) {
      return {
        type: 'already_attempted',
        message: `Question ${questionId} already completed - ${isTimeUp ? '2 fish' : 'no points'} available for correct answer`
      }
    } else if (questionId > attempted + 1) {
      return {
        type: 'future_question',
        message: `Complete question ${attempted + 1} first to unlock this question`
      }
    } else {
      return {
        type: 'new_question',
        message: `New question ${questionId} - ${isTimeUp ? '2 fish for correct answer (time up)' : '5 fish available for correct answer!'}`
      }
    }
  }

  const questionStatus = getQuestionStatus()

  return (
    <div className="min-h-screen bg-gray-50 text-black font-mono">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-4 shadow-sm">
        <div className="max-w-full mx-auto flex justify-between items-center px-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl animate-pulse">🐾</span>
            <h1 className="text-2xl font-light"><a href='/home'>9lives</a></h1>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Timer</p>
              <p className={`text-sm font-light ${
                hasSubmitted ? 'text-gray-400' : 
                isTimeUp ? 'text-red-600' : 
                timeLeft < 30 ? 'text-red-600 animate-pulse' : 
                timeLeft < 60 ? 'text-orange-500' : ''
              }`}>
                {hasSubmitted ? 'Completed ✓' : 
                 isTimeUp ? 'Time Up! ⏰' : 
                 `${formatTime(timeLeft)} ⏰`}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Fish</p>
              <p className="text-sm font-light">
                {profileLoading ? (
                  <span className="animate-pulse">Loading...</span>
                ) : (
                  <>
                    {profile?.total_points || 0} 🐟
                    {showAnimation && (
                      <span className="inline-block ml-2">
                        <span className="animate-bounce text-lg text-green-600">
                          +{isTimeUp ? '2' : '5'}
                        </span>
                        <span className="inline-block animate-bounce ml-1" style={{animationDelay: '0.2s'}}>🐟</span>
                      </span>
                    )}
                  </>
                )}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Streak</p>
              <p className="text-sm font-light">
                {profileLoading ? (
                  <span className="animate-pulse">Loading...</span>
                ) : (
                  <>
                    <span className={streakData.isToday ? '' : 'text-gray-400'}>
                      {streakData.text}
                    </span>
                    {' '}
                    <span className={streakData.isToday ? '' : 'grayscale opacity-60'}>
                      🔥
                    </span>
                  </>
                )}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Progress</p>
              <p className="text-sm font-light">
                {profileLoading ? (
                  <span className="animate-pulse">Loading...</span>
                ) : (
                  `${profile?.aptitude_questions_attempted || 0} completed`
                )}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Question {questionId}</p>
              <p className="text-sm font-light">Aptitude Mode</p>
            </div>
          </div>
        </div>
      </header>

      {/* Question Status Banner */}
      {questionStatus && (
        <div className={`px-4 py-2 text-center text-sm ${
          questionStatus.type === 'new_question' 
            ? isTimeUp 
              ? 'bg-orange-100 text-orange-800 border-b border-orange-200'
              : 'bg-green-100 text-green-800 border-b border-green-200' 
            : questionStatus.type === 'already_attempted'
            ? 'bg-yellow-100 text-yellow-800 border-b border-yellow-200'
            : 'bg-red-100 text-red-800 border-b border-red-200'
        }`}>
          {questionStatus.message}
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-full mx-auto px-4 py-8">
        {/* Question */}
        <div className="mb-8">
          <div className="bg-white border border-gray-200 hover:border-gray-300 transition-all duration-300">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">❓</span>
                <h3 className="font-mono font-medium text-lg">Question {questionId}</h3>
                {isNewQuestion && (
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                    NEW
                  </span>
                )}
                {!isNewQuestion && questionStatus?.type === 'already_attempted' && (
                  <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs font-medium">
                    COMPLETED
                  </span>
                )}
                {isTimeUp && (
                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                    TIME UP
                  </span>
                )}
              </div>
              <div className="text-gray-800 text-base leading-relaxed">
                <ContentRenderer content={questionData.question} />
              </div>
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="mb-8">
          <div className="bg-white border border-gray-200">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-2xl">🎯</span>
                <h3 className="font-mono font-medium text-lg">Choose Your Answer</h3>
                {!showExplanation && (
                  <span className="text-xs text-gray-500 ml-2">
                    {isTimeUp ? '(Can still answer - reduced points)' : '(Double-click to auto-submit)'}
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {shuffledOptions.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleOptionClick(index)}
                    disabled={showExplanation}
                    className={`w-full p-4 text-left border transition-all duration-200 font-mono text-sm ${
                      showExplanation
                        ? index === correctIndex
                          ? 'bg-green-50 border-green-500 text-green-800'
                          : selectedOption === index
                            ? 'bg-red-50 border-red-500 text-red-800'
                            : 'bg-gray-50 border-gray-200'
                        : selectedOption === index
                          ? 'bg-blue-50 border-blue-500 text-blue-800'
                          : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:bg-gray-100'
                    } ${showExplanation ? 'cursor-not-allowed' : 'cursor-pointer hover:shadow-sm'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-start">
                        <span className="font-bold mr-3 text-gray-900 mt-1">
                          {String.fromCharCode(65 + index)}.
                        </span>
                        <div className="flex-1">
                          <ContentRenderer content={option} />
                        </div>
                      </div>
                      {showExplanation && index === correctIndex && (
                        <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full border-2 border-green-500 ml-2">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                          </svg>
                        </div>
                      )}
                      {showExplanation && selectedOption === index && index !== correctIndex && (
                        <div className="flex items-center justify-center w-8 h-8 bg-red-100 rounded-full border-2 border-red-500 ml-2">
                          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path>
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4 mb-8">
          {!showExplanation && !hasSubmitted && (
            <button
              onClick={() => handleSubmit()}
              disabled={selectedOption === null}
              className={`py-3 px-8 font-mono text-base transition-all duration-300 border-2 ${
                selectedOption !== null
                  ? 'bg-gray-900 text-white hover:bg-gray-800 border-gray-700 hover:border-gray-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed border-gray-300'
              }`}
            >
              {selectedOption !== null 
                ? isTimeUp 
                  ? 'Submit Answer (2 fish for correct)' 
                  : 'Submit Answer' 
                : 'Select an option first'
              }
            </button>
          )}

          {/* Show next button after submission (whether explanation is visible or not) */}
          {hasSubmitted && (
            <div className="flex gap-4">
              {showExplanation && (
                <button
                  onClick={handleCloseExplanation}
                  className="py-3 px-8 bg-blue-100 text-blue-800 border-2 border-blue-200 hover:bg-blue-200 font-mono text-base transition-all duration-300"
                >
                  Close Explanation
                </button>
              )}
              <button
                onClick={handleNext}
                className="py-3 px-8 bg-gray-900 text-white border-2 border-gray-700 hover:bg-gray-800 hover:border-gray-600 font-mono text-base transition-all duration-300 flex items-center gap-2"
              >
                Next Question
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </button>
            </div>
          )}

          {questionData.formula_or_logic && (
            <button
              onClick={() => setShowHint(!showHint)}
              className="py-3 px-6 bg-orange-100 text-orange-800 border-2 border-orange-200 hover:bg-orange-200 font-mono text-base transition-all duration-300"
            >
              {showHint ? 'Hide Hint' : 'Show Hint'} 💡
            </button>
          )}
        </div>

        {/* Hint Section */}
        {showHint && questionData.formula_or_logic && (
          <div className="mb-8">
            <div className="bg-orange-50 border border-orange-200">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">💡</span>
                  <h3 className="font-mono font-medium text-lg text-orange-800">Hint & Formula</h3>
                </div>
                <div className="text-orange-900">
                  <ContentRenderer content={questionData.formula_or_logic} />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Explanation Popup */}
      <ExplanationPopup
        isVisible={showExplanation}
        onClose={handleCloseExplanation}
        questionData={questionData}
        selectedOption={selectedOption}
        correctIndex={correctIndex}
        shuffledOptions={shuffledOptions}
        isTimeUp={isTimeUp}
        preloadedGifs={preloadedGifs}
        questionId={questionId}
      />
    </div>
  )
}
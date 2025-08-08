import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'

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

// Mathematical formula renderer
const MathRenderer = ({ content }: { content: string }) => {
  if (!content) return null

  const parseMath = (text: string): (string | React.ReactNode)[] => {
    const result: (string | React.ReactNode)[] = []
    let remaining = text
    let keyCounter = 0

    // Process fractions
    const fractionRegex = /\(([^()]*(?:\([^)]*\)[^()]*)*)\)\s*\/\s*\(([^()]*(?:\([^)]*\)[^()]*)*)\)|([a-zA-Z0-9\+\-\*\s]+)\s*\/\s*([a-zA-Z0-9\+\-\*\s]+)/g
    let lastIndex = 0
    let match

    while ((match = fractionRegex.exec(remaining)) !== null) {
      if (match.index > lastIndex) {
        const beforeText = remaining.slice(lastIndex, match.index)
        result.push(...parseSimpleMath(beforeText))
      }

      const numerator = match[1] || match[3] || ''
      const denominator = match[2] || match[4] || ''
      
      result.push(
        <span key={`fraction-${keyCounter++}`} className="inline-block text-center align-middle mx-1 relative">
          <span className="block border-b-2 border-gray-700 px-1.5 py-0.5 text-sm min-w-5 leading-tight">
            {parseSimpleMath(numerator.trim())}
          </span>
          <span className="block px-1.5 py-0.5 text-sm min-w-5 leading-tight">
            {parseSimpleMath(denominator.trim())}
          </span>
        </span>
      )

      lastIndex = match.index + match[0].length
    }

    if (lastIndex < remaining.length) {
      result.push(...parseSimpleMath(remaining.slice(lastIndex)))
    }

    return result
  }

  const parseSimpleMath = (text: string): (string | React.ReactNode)[] => {
    if (!text) return []
    
    let result: (string | React.ReactNode)[] = []
    let remaining = text
    let keyCounter = 0

    // Square roots
    remaining = remaining.replace(/sqrt\s*\(\s*([^)]+)\s*\)/g, (match, content) => {
      const id = `SQRT_${keyCounter++}`
      result.push(
        <span key={id} className="relative inline-block mx-0.5 text-lg align-middle">
          √<span className="border-t-2 border-gray-700 pt-0.5 ml-0.5 pl-0.5 pr-0.5 min-w-4 inline-block">
            {content}
          </span>
        </span>
      )
      return `__${id}__`
    })

    // Handle exponents and subscripts
    remaining = remaining.replace(/\^(\{[^}]+\}|\([^)]+\)|[a-zA-Z0-9\+\-]+)/g, (match, exp) => {
      const id = `SUP_${keyCounter++}`
      const cleanExp = exp.replace(/[\{\}()]/g, '')
      result.push(<sup key={id} className="text-xs align-super leading-none mx-0.5">{cleanExp}</sup>)
      return `__${id}__`
    })

    remaining = remaining.replace(/_(\{[^}]+\}|\([^)]+\)|[a-zA-Z0-9\+\-]+)/g, (match, sub) => {
      const id = `SUB_${keyCounter++}`
      const cleanSub = sub.replace(/[\{\}()]/g, '')
      result.push(<sub key={id} className="text-xs align-sub leading-none mx-0.5">{cleanSub}</sub>)
      return `__${id}__`
    })

    // Greek letters and symbols
    const symbols = {
      '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ',
      '\\epsilon': 'ε', '\\theta': 'θ', '\\lambda': 'λ', '\\mu': 'μ',
      '\\nu': 'ν', '\\pi': 'π', '\\sigma': 'σ', '\\tau': 'τ',
      '\\phi': 'φ', '\\omega': 'ω', '\\infty': '∞', '\\partial': '∂',
      '\\nabla': '∇', '\\pm': '±', '\\times': '×', '\\div': '÷',
      '\\leq': '≤', '\\geq': '≥', '\\neq': '≠', '\\approx': '≈',
      '\\in': '∈', '\\subset': '⊂', '\\cup': '∪', '\\cap': '∩',
      '\\rightarrow': '→', '\\leftarrow': '←', '\\Rightarrow': '⇒'
    }

    for (const [latex, symbol] of Object.entries(symbols)) {
      remaining = remaining.replace(new RegExp(latex.replace('\\', '\\\\'), 'g'), symbol)
    }

    // Split by placeholders and rebuild
    const parts = remaining.split(/(__[A-Z_0-9]+__)/g)
    const finalResult: (string | React.ReactNode)[] = []

    parts.forEach(part => {
      if (part.startsWith('__') && part.endsWith('__')) {
        const element = result.find(el => 
          el && typeof el === 'object' && 'key' in el && el.key === part.slice(2, -2)
        )
        if (element) {
          finalResult.push(element)
        }
      } else if (part) {
        finalResult.push(part)
      }
    })

    return finalResult.length > 0 ? finalResult : [remaining]
  }

  return (
    <span className="font-serif text-base leading-relaxed inline-block align-middle">
      {parseMath(content)}
    </span>
  )
}

// Markdown renderer
const MarkdownRenderer = ({ content }: { content: string }) => {
  if (!content) return null

  const renderInlineContent = (text: string) => {
    // LaTeX-style inline math
    const inlineMathRegex = /\$([^$]+)\$/g
    const inlineMathParts = text.split(inlineMathRegex)
    
    return inlineMathParts.map((part, i) => {
      if (i % 2 === 1) {
        return (
          <span 
            key={`inline-${i}`} 
            className="inline-block bg-blue-50 text-gray-800 px-2 py-1 border mx-1 font-serif text-base"
          >
            <MathRenderer content={part} />
          </span>
        )
      }
      
      // Process code blocks
      const codeRegex = /`([^`]+)`/g
      const codeParts = part.split(codeRegex)
      
      return codeParts.map((codePart, j) => {
        if (j % 2 === 1) {
          return (
            <span 
              key={`${i}-code-${j}`} 
              className="inline-block bg-gray-100 text-gray-800 px-3 py-2 border mx-1 font-serif text-base"
            >
              <MathRenderer content={codePart} />
            </span>
          )
        }
        
        // Process bold and italic
        const boldRegex = /\*\*(.*?)\*\*/g
        const boldParts = codePart.split(boldRegex)
        
        return boldParts.map((boldPart, k) => {
          if (k % 2 === 1) {
            return <strong key={`${i}-${j}-bold-${k}`} className="font-semibold text-gray-900">{boldPart}</strong>
          }
          
          const italicRegex = /\*([^*]+)\*/g
          const italicParts = boldPart.split(italicRegex)
          
          return italicParts.map((italicPart, l) => {
            if (l % 2 === 1) {
              return <em key={`${i}-${j}-${k}-italic-${l}`} className="italic text-gray-800">{italicPart}</em>
            }
            return italicPart
          })
        })
      })
    })
  }

  const lines = content.split('\n')
  
  return (
    <>
      {lines.map((line, index) => (
        line.trim() ? (
          <p key={index} className="mb-4 text-sm text-gray-700 leading-relaxed">
            {renderInlineContent(line.trim())}
          </p>
        ) : (
          <div key={index} className="mb-4" />
        )
      ))}
    </>
  )
}

export default function QuestionComponent({ questionData, questionId }: QuestionComponentProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [showAnimation, setShowAnimation] = useState(false)
  const [timeLeft, setTimeLeft] = useState(120) // 2 minutes
  const [isTimeUp, setIsTimeUp] = useState(false)
  const [preloadedGifs, setPreloadedGifs] = useState<{ happy: { src: string, isCached: boolean } | null, sad: { src: string, isCached: boolean } | null }>({ happy: null, sad: null })
  const [lastClickTime, setLastClickTime] = useState<{ [key: number]: number }>({})
  const router = useRouter()

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

  // Preload GIFs on component mount
  useEffect(() => {
    const loadGifs = async () => {
      const gifs = await GifCache.preloadGifs()
      setPreloadedGifs(gifs)
    }
    loadGifs()
  }, [])

  // Fetch profile and start timer
  useEffect(() => {
    fetchProfile()
  }, [])

  // Timer
  useEffect(() => {
    if (timeLeft > 0 && !showExplanation) {
      const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && !showExplanation) {
      setIsTimeUp(true)
      handleSubmit(true)
    }
  }, [timeLeft, showExplanation])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/auth/profile', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        if (data.profile) {
          setProfile(data.profile)
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setProfileLoading(false)
    }
  }

  const updateAptitudeProgress = async () => {
    if (!profile) return false
    
    // Only update if this is the next question in sequence
    const shouldUpdate = questionId === (profile.aptitude_questions_attempted || 0) + 1
    if (!shouldUpdate) return false
    
    try {
      const response = await fetch('/api/update/aptitude-questions', {
        method: 'POST',
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setProfile(prev => prev ? {
            ...prev,
            aptitude_questions_attempted: data.new_count
          } : null)
          return true
        }
      }
    } catch (error) {
      console.error('Error updating aptitude progress:', error)
    }
    return false
  }

  const calculatePoints = (isCorrect: boolean, timeRemaining: number, isTimeUp: boolean): number => {
    if (!isCorrect || isTimeUp) return 0
    return 5 // 5 fish for correct answer within time limit
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

  const handleSubmit = async (timeUpSubmission = false) => {
    if (selectedOption === null && !timeUpSubmission) return

    const isCorrect = selectedOption === correctIndex
    const pointsToAward = calculatePoints(isCorrect, timeLeft, timeUpSubmission)
    
    // Trigger confetti for correct answers
    if (isCorrect && !timeUpSubmission) {
      createConfetti()
    }
    
    // Award points if correct
    if (pointsToAward > 0) {
      try {
        const pointsResponse = await fetch('/api/add/points', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ points: pointsToAward }),
          credentials: 'include'
        })
        
        if (pointsResponse.ok) {
          const data = await pointsResponse.json()
          if (data.new_total && profile) {
            setProfile(prev => prev ? { ...prev, total_points: data.new_total } : null)
          }
          setShowAnimation(true)
          setTimeout(() => setShowAnimation(false), 2000)
        }
      } catch (error) {
        console.error('Error awarding points:', error)
      }
    }

    // Update progress
    await updateAptitudeProgress()
    setShowExplanation(true)
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

  const getResultGif = () => {
    if (isTimeUp) return null
    if (selectedOption === correctIndex) return preloadedGifs.happy
    return preloadedGifs.sad
  }

  const resultGif = getResultGif()

  return (
    <div className="min-h-screen bg-gray-50 text-black font-mono">
      {/* CSS for animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-4 shadow-sm">
        <div className="max-w-full mx-auto flex justify-between items-center px-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl animate-pulse">🐾</span>
            <h1 className="text-2xl font-light">9lives</h1>
          </div>
          
          <div className="flex items-center gap-8">
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Timer</p>
              <p className={`text-sm font-light ${timeLeft < 30 ? 'text-red-600 animate-pulse' : timeLeft < 60 ? 'text-orange-500' : ''}`}>
                {formatTime(timeLeft)} ⏰
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
                        <span className="animate-bounce text-lg text-green-600">+5</span>
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
              <p className="text-xs text-gray-400 uppercase tracking-wider">Question {questionId}</p>
              <p className="text-sm font-light">Aptitude Mode</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-full mx-auto px-4 py-8">
        {/* Question */}
        <div className="mb-8">
          <div className="bg-white border border-gray-200 hover:border-gray-300 transition-all duration-300">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">❓</span>
                <h3 className="font-mono font-medium text-lg">Question {questionId}</h3>
              </div>
              <div className="text-gray-800 text-base leading-relaxed">
                <MarkdownRenderer content={questionData.question} />
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
                <span className="text-xs text-gray-500 ml-2">(Double-click to auto-submit)</span>
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
                          <MarkdownRenderer content={option} />
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
          {!showExplanation && !isTimeUp && (
            <button
              onClick={() => handleSubmit()}
              disabled={selectedOption === null}
              className={`py-3 px-8 font-mono text-base transition-all duration-300 border-2 ${
                selectedOption !== null
                  ? 'bg-gray-900 text-white hover:bg-gray-800 border-gray-700 hover:border-gray-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed border-gray-300'
              }`}
            >
              {selectedOption !== null ? 'Submit Answer' : 'Select an option first'}
            </button>
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
                  <MarkdownRenderer content={questionData.formula_or_logic} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Explanation Popup Modal */}
        {showExplanation && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden animate-fadeIn">
              <div className="flex h-full">
                {/* Left Side - GIF */}
                <div className="w-1/3 bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col items-center justify-center p-8 border-r border-gray-200">
                  {resultGif && !isTimeUp ? (
                    <div className="text-center">
                      <img 
                        src={resultGif.src}
                        alt={selectedOption === correctIndex ? "Celebration" : "Sad reaction"}
                        className={selectedOption === correctIndex ? "w-56 h-72 object-contain mb-4" : "w-48 h-48 object-contain mb-4"}
                        title={`GIF ${resultGif.isCached ? 'loaded from cache' : 'fetched online'}`}
                      />
                      <div className="text-center">
                        {selectedOption === correctIndex ? (
                          <div>
                            <span className="text-2xl font-bold text-green-600 block mb-2">🎉 Fantastic! 🎉</span>
                            <span className="text-lg text-green-700">You got it right!</span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-xl font-medium text-red-600 block mb-2">Don't worry!</span>
                            <span className="text-lg text-red-700">Keep learning! 💪</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : isTimeUp ? (
                    <div className="text-center">
                      <span className="text-8xl mb-4 block">⏰</span>
                      <span className="text-2xl font-bold text-red-600 block mb-2">Time's Up!</span>
                      <span className="text-lg text-red-700">Better luck next time!</span>
                    </div>
                  ) : (
                    <div className="text-center">
                      <span className="text-6xl mb-4 block">🤔</span>
                      <span className="text-xl text-gray-600">Loading...</span>
                    </div>
                  )}
                  
                  {/* Result Summary in Left Panel */}
                  <div className="mt-8 p-4 bg-white rounded-lg shadow-sm border w-full">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        {isTimeUp ? (
                          <span className="font-medium text-red-600">⏰ Time's Up!</span>
                        ) : selectedOption === correctIndex ? (
                          <span className="font-medium text-green-600">✅ Correct Answer!</span>
                        ) : (
                          <span className="font-medium text-red-600">❌ Incorrect Answer</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700">
                        {isTimeUp 
                          ? "No points awarded when time runs out."
                          : selectedOption === correctIndex
                            ? "Great job! You earned 5 fish! 🐟"
                            : "Better luck next time! Keep practicing to improve."
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Side - Explanation & Controls */}
                <div className="w-2/3 flex flex-col">
                  {/* Header */}
                  <div className="bg-blue-600 text-white p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📝</span>
                      <h3 className="font-mono font-medium text-xl">Explanation</h3>
                    </div>
                    <button
                      onClick={() => setShowExplanation(false)}
                      className="text-white hover:text-gray-200 transition-colors p-1"
                      title="Close"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    </button>
                  </div>

                  {/* Scrollable Content */}
                  <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    <div className="bg-white rounded-lg p-6 shadow-sm">
                      <div className="text-gray-800 prose prose-sm max-w-none">
                        <MarkdownRenderer content={questionData.explanation} />
                      </div>
                    </div>
                  </div>

                  {/* Footer with Actions */}
                  <div className="bg-white border-t border-gray-200 p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                        Correct: {String.fromCharCode(65 + correctIndex)}. {shuffledOptions[correctIndex].substring(0, 30)}...
                      </span>
                      {selectedOption !== null && selectedOption !== correctIndex && (
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                          Your choice: {String.fromCharCode(65 + selectedOption)}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowExplanation(false)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors font-mono text-sm border border-gray-300"
                      >
                        Close
                      </button>
                      <button
                        onClick={() => router.push(`/aptitude/${questionId + 1}`)}
                        className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors font-mono text-sm flex items-center gap-2 shadow-sm"
                      >
                        Next Question
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
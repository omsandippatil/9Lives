import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

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
  coding_questions_attempted: number
  technical_questions_attempted: number
  fundamental_questions_attempted: number
  tech_topics_covered: number
  current_streak: [string, number] | null // JSONB format: ["2025-08-04", 1]
  total_points: number
  created_at: string
  updated_at: string
}

// Mathematical formula renderer (same as theory component)
const MathRenderer = ({ content }: { content: string }) => {
  if (!content) return null

  const parseMath = (text: string): (string | React.ReactNode)[] => {
    const result: (string | React.ReactNode)[] = []
    let remaining = text
    let keyCounter = 0

    // Process fractions first (most complex)
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

    // Handle exponents
    remaining = remaining.replace(/\^(\{[^}]+\}|\([^)]+\)|[a-zA-Z0-9\+\-]+)/g, (match, exp) => {
      const id = `SUP_${keyCounter++}`
      const cleanExp = exp.replace(/[\{\}()]/g, '')
      result.push(<sup key={id} className="text-xs align-super leading-none mx-0.5">{cleanExp}</sup>)
      return `__${id}__`
    })

    // Handle subscripts
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

// Enhanced markdown renderer (same as theory component)
const MarkdownRenderer = ({ content }: { content: string }) => {
  if (!content) return null

  const lines = content.split('\n')
  const elements: React.ReactElement[] = []

  const renderInlineContent = (text: string) => {
    let processedText = text

    // LaTeX-style inline math $formula$
    const inlineMathRegex = /\$([^$]+)\$/g
    const inlineMathParts = processedText.split(inlineMathRegex)
    
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
      } else {
        return processOtherFormats(part, i)
      }
    })
  }

  const processOtherFormats = (text: string, baseIndex: number) => {
    const codeRegex = /`([^`]+)`/g
    const parts = text.split(codeRegex)
    
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return (
          <span 
            key={`${baseIndex}-code-${i}`} 
            className="inline-block bg-gray-100 text-gray-800 px-3 py-2 border mx-1 font-serif text-base"
          >
            <MathRenderer content={part} />
          </span>
        )
      } else {
        return processTextFormatting(part, `${baseIndex}-${i}`)
      }
    })
  }

  const processTextFormatting = (text: string, keyPrefix: string) => {
    const boldRegex = /\*\*(.*?)\*\*/g
    const boldParts = text.split(boldRegex)
    
    return boldParts.map((segment, j) => {
      if (j % 2 === 1) {
        return <strong key={`${keyPrefix}-bold-${j}`} className="font-semibold text-gray-900">{segment}</strong>
      } else {
        const italicRegex = /\*([^*]+)\*/g
        const italicParts = segment.split(italicRegex)
        
        return italicParts.map((italicSegment, k) => {
          if (k % 2 === 1) {
            return <em key={`${keyPrefix}-italic-${j}-${k}`} className="italic text-gray-800">{italicSegment}</em>
          } else {
            return italicSegment
          }
        })
      }
    })
  }

  lines.forEach((line, index) => {
    const trimmedLine = line.trim()
    
    if (!trimmedLine) {
      elements.push(<div key={index} className="mb-4" />)
      return
    }

    elements.push(
      <p key={index} className="mb-4 text-sm text-gray-700 leading-relaxed">
        {renderInlineContent(trimmedLine)}
      </p>
    )
  })

  return <>{elements}</>
}

export default function QuestionComponent({ questionData, questionId }: QuestionComponentProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [catAnimation, setCatAnimation] = useState('🤔')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [showAnimation, setShowAnimation] = useState(false)
  const [timeLeft, setTimeLeft] = useState(120) // 2 minutes in seconds
  const [isTimeUp, setIsTimeUp] = useState(false)
  const router = useRouter()

  // Fetch user profile on component mount
  useEffect(() => {
    fetchProfile()
  }, [])

  // Timer effect
  useEffect(() => {
    if (timeLeft > 0 && !showExplanation) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timerId)
    } else if (timeLeft === 0 && !showExplanation) {
      setIsTimeUp(true)
      // Auto-submit when time runs out
      handleSubmit(true)
    }
  }, [timeLeft, showExplanation])

  // Cat animation effect
  useEffect(() => {
    if (showExplanation) {
      const celebrationCats = ['🎉', '😸', '🏆', '😻', '✨', '🌟']
      let index = 0
      
      const interval = setInterval(() => {
        index = (index + 1) % celebrationCats.length
        setCatAnimation(celebrationCats[index])
      }, 1000)
      
      return () => clearInterval(interval)
    } else {
      const thinkingCats = ['🤔', '😺', '🧐', '😸', '💭']
      let index = 0
      
      const interval = setInterval(() => {
        index = (index + 1) % thinkingCats.length
        setCatAnimation(thinkingCats[index])
      }, 2000)
      
      return () => clearInterval(interval)
    }
  }, [showExplanation])

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Get streak display based on JSONB format
  const getStreakDisplay = (currentStreak: [string, number] | null) => {
    if (!currentStreak || !Array.isArray(currentStreak) || currentStreak.length < 2) {
      return { text: `0`, isToday: false }
    }
    
    const [dateStr, streakValue] = currentStreak
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    
    const streakDate = new Date(dateStr)
    const todayStr = today.toDateString()
    const yesterdayStr = yesterday.toDateString()
    const streakDateStr = streakDate.toDateString()
    
    if (streakDateStr === todayStr) {
      return { text: `${streakValue}`, isToday: true }
    } else if (streakDateStr === yesterdayStr) {
      return { text: `${streakValue}`, isToday: false }
    } else {
      return { text: `0`, isToday: false }
    }
  }

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
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

  const shouldUpdateProgress = (): boolean => {
    if (!profile) return false
    
    const userProgress = profile.technical_questions_attempted || 0
    const shouldUpdate = questionId === userProgress + 1
    
    return shouldUpdate
  }

  const updateTechnicalProgress = async () => {
    if (!profile) return false
    
    const shouldUpdate = shouldUpdateProgress()
    if (!shouldUpdate) {
      console.log('Progress update skipped - question not in sequence')
      return false
    }
    
    try {
      const response = await fetch('/api/update/technical-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        
        if (data.success) {
          // Update local profile state
          setProfile(prev => prev ? {
            ...prev,
            technical_questions_attempted: data.new_count
          } : null)
          return true
        }
      }
    } catch (error) {
      console.error('Error updating technical progress:', error)
    }
    return false
  }

  const calculatePoints = (isCorrect: boolean, timeRemaining: number, isTimeUp: boolean): number => {
    if (!isCorrect) {
      return 0 // No points for wrong answer
    }
    
    if (isTimeUp) {
      return 0 // No points if time is up
    }
    
    // Base points for correct answer: 2 fish
    // Time bonus: +3 fish for completing in time
    return 5 // Total 5 fish for correct answer within time limit
  }

  const handleOptionSelect = (optionIndex: number) => {
    if (!showExplanation) {
      setSelectedOption(optionIndex)
    }
  }

  const handleSubmit = async (timeUpSubmission = false) => {
    if (selectedOption === null && !timeUpSubmission) return

    const isCorrect = selectedOption === 0 // First option is always correct
    const pointsToAward = calculatePoints(isCorrect, timeLeft, timeUpSubmission)
    
    if (isCorrect && pointsToAward > 0) {
      // Add points for correct answer
      try {
        const response = await fetch('/api/add/points', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ points: pointsToAward }),
          credentials: 'include'
        })
        
        if (response.ok) {
          const data = await response.json()
          
          // Update profile points
          if (data.new_total && profile) {
            setProfile(prev => prev ? {
              ...prev,
              total_points: data.new_total
            } : null)
          }
          
          setShowAnimation(true)
          setTimeout(() => setShowAnimation(false), 2000)
        }
        
        // Update technical progress
        await updateTechnicalProgress()
      } catch (error) {
        console.error('Error awarding points:', error)
      }
    }

    setShowExplanation(true)
  }

  const handleNext = () => {
    const nextId = questionId + 1
    router.push(`/aptitude/${nextId}`)
  }

  // Get streak data
  const streakData = getStreakDisplay(profile?.current_streak || null)

  return (
    <div className="min-h-screen bg-gray-50 text-black font-mono">
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
                        <span className="animate-bounce text-lg text-green-600">+{calculatePoints(selectedOption === 0, timeLeft, isTimeUp)}</span>
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
              <p className="text-sm font-light">Practice Mode</p>
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
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {questionData.options?.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleOptionSelect(index)}
                    disabled={showExplanation}
                    className={`w-full p-4 text-left border transition-all duration-200 font-mono text-sm ${
                      showExplanation
                        ? index === 0
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
                      {showExplanation && index === 0 && (
                        <span className="text-green-600 text-lg ml-2">✓</span>
                      )}
                      {showExplanation && selectedOption === index && index !== 0 && (
                        <span className="text-red-600 text-lg ml-2">✗</span>
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
          {/* Submit Button */}
          {!showExplanation && !isTimeUp && (
            <button
              onClick={() => handleSubmit()}
              disabled={selectedOption === null}
              className={`py-3 px-8 font-mono text-base transition-all duration-300 ${
                selectedOption !== null
                  ? 'bg-gray-900 text-white hover:bg-gray-800'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {selectedOption !== null ? 'Submit Answer' : 'Select an option first'}
            </button>
          )}

          {/* Hint Button */}
          {questionData.formula_or_logic && (
            <button
              onClick={() => setShowHint(!showHint)}
              className="py-3 px-6 bg-orange-100 text-orange-800 border border-orange-200 hover:bg-orange-200 font-mono text-base transition-all duration-300"
            >
              {showHint ? 'Hide Hint' : 'Show Hint'} 💡
            </button>
          )}

          {/* Show Explanation Button */}
          {showExplanation && (
            <button
              onClick={() => setShowExplanation(!showExplanation)}
              className="py-3 px-6 bg-blue-100 text-blue-800 border border-blue-200 hover:bg-blue-200 font-mono text-base transition-all duration-300"
            >
              {showExplanation ? 'Hide Explanation' : 'View Explanation'} 📝
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

        {/* Explanation */}
        {showExplanation && (
          <div className="mb-8">
            <div className="bg-blue-50 border border-blue-200">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">📝</span>
                  <h3 className="font-mono font-medium text-lg text-blue-800">Explanation</h3>
                </div>
                <div className="text-blue-900">
                  <MarkdownRenderer content={questionData.explanation} />
                </div>
                
                {/* Result Summary */}
                <div className="mt-6 p-4 bg-white border-l-4 border-blue-400">
                  <div className="flex items-center gap-2 mb-2">
                    {isTimeUp ? (
                      <>
                        <span className="text-xl">⏰</span>
                        <span className="font-medium text-red-600">Time's Up!</span>
                      </>
                    ) : selectedOption === 0 ? (
                      <>
                        <span className="text-xl">🎉</span>
                        <span className="font-medium text-green-600">Correct Answer!</span>
                      </>
                    ) : (
                      <>
                        <span className="text-xl">❌</span>
                        <span className="font-medium text-red-600">Incorrect Answer</span>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">
                    {isTimeUp 
                      ? "No points awarded when time runs out."
                      : selectedOption === 0
                        ? `Great job! You earned ${calculatePoints(true, timeLeft, false)} fish! 🐟`
                        : "Better luck next time! Keep practicing to improve."
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Next Button */}
        {showExplanation && (
          <div className="text-center py-6 border-t border-gray-200 bg-white">
            <p className="text-base text-gray-600 font-light mb-4">
              Ready for the next challenge?
            </p>
            <button
              onClick={handleNext}
              className="py-3 px-8 bg-gray-900 text-white font-mono text-base hover:bg-gray-800 transition-all duration-300"
            >
              Next Question →
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
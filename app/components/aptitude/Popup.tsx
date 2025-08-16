import { useRouter } from 'next/navigation'
import { useEffect, useCallback, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import 'katex/dist/katex.min.css'

interface ExplanationPopupProps {
  isVisible: boolean
  onClose: () => void
  questionData: {
    explanation: string
  }
  selectedOption: number | null
  correctIndex: number
  shuffledOptions: string[]
  isTimeUp: boolean
  preloadedGifs: {
    happy: { src: string, isCached: boolean } | null
    sad: { src: string, isCached: boolean } | null
  }
  questionId: number
}

// Custom components for ReactMarkdown in the popup
const PopupMarkdownComponents = {
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
        <code className="inline-block bg-gray-50 text-gray-800 px-2 py-1 border mx-1 font-mono text-sm rounded" {...props}>
          {children}
        </code>
      )
    }
    return (
      <pre className="bg-gray-50 text-gray-800 p-3 border font-mono text-sm rounded overflow-x-auto mb-4" {...props}>
        <code>{children}</code>
      </pre>
    )
  },
  pre: ({ children, ...props }: any) => (
    <div {...props}>{children}</div>
  ),
  h1: ({ children, ...props }: any) => (
    <h1 className="text-xl font-bold text-gray-900 mb-4 mt-6 first:mt-0" {...props}>{children}</h1>
  ),
  h2: ({ children, ...props }: any) => (
    <h2 className="text-lg font-semibold text-gray-900 mb-3 mt-5 first:mt-0" {...props}>{children}</h2>
  ),
  h3: ({ children, ...props }: any) => (
    <h3 className="text-base font-medium text-gray-900 mb-2 mt-4 first:mt-0" {...props}>{children}</h3>
  ),
  h4: ({ children, ...props }: any) => (
    <h4 className="text-sm font-medium text-gray-900 mb-2 mt-3 first:mt-0" {...props}>{children}</h4>
  ),
  ul: ({ children, ...props }: any) => (
    <ul className="list-disc list-inside mb-4 text-sm text-gray-700 space-y-1" {...props}>{children}</ul>
  ),
  ol: ({ children, ...props }: any) => (
    <ol className="list-decimal list-inside mb-4 text-sm text-gray-700 space-y-1" {...props}>{children}</ol>
  ),
  li: ({ children, ...props }: any) => (
    <li className="mb-1" {...props}>{children}</li>
  ),
  blockquote: ({ children, ...props }: any) => (
    <blockquote className="border-l-4 border-blue-300 pl-4 italic text-gray-600 mb-4 bg-blue-50 py-2" {...props}>
      {children}
    </blockquote>
  ),
  table: ({ children, ...props }: any) => (
    <div className="overflow-x-auto mb-4">
      <table className="min-w-full border-collapse border border-gray-300" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }: any) => (
    <thead className="bg-gray-100" {...props}>{children}</thead>
  ),
  th: ({ children, ...props }: any) => (
    <th className="border border-gray-300 px-3 py-2 font-medium text-left text-sm" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }: any) => (
    <td className="border border-gray-300 px-3 py-2 text-sm" {...props}>{children}</td>
  ),
  hr: ({ ...props }: any) => (
    <hr className="border-t-2 border-gray-200 my-6" {...props} />
  ),
  a: ({ children, href, ...props }: any) => (
    <a 
      href={href} 
      className="text-blue-600 hover:text-blue-800 underline" 
      target="_blank" 
      rel="noopener noreferrer" 
      {...props}
    >
      {children}
    </a>
  ),
  // Custom component for math blocks
  div: ({ children, className, ...props }: any) => {
    if (className?.includes('math-display')) {
      return (
        <div className="math-display my-4 text-center bg-gray-50 p-3 border rounded" {...props}>
          {children}
        </div>
      )
    }
    return <div className={className} {...props}>{children}</div>
  }
}

// Content renderer specifically for the popup
const PopupContentRenderer = ({ content }: { content: string }) => {
  if (!content) return null

  return (
    <div className="prose prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={PopupMarkdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

export default function ExplanationPopup({
  isVisible,
  onClose,
  questionData,
  selectedOption,
  correctIndex,
  shuffledOptions,
  isTimeUp,
  preloadedGifs,
  questionId
}: ExplanationPopupProps) {
  const router = useRouter()
  const modalRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const streakProcessedRef = useRef(false)
  const questionAttemptedRef = useRef(false)

  // Memoized close handler to prevent recreation
  const handleClose = useCallback(() => {
    console.log('Popup close requested')
    onClose()
  }, [onClose])

  // Handle escape key
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isVisible) {
        handleClose()
      }
    }

    if (isVisible) {
      document.addEventListener('keydown', handleEscKey)
      // Prevent body scroll when popup is open
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey)
      document.body.style.overflow = 'unset'
    }
  }, [isVisible, handleClose])

  // Handle overlay click
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    // Only close if clicking directly on the overlay, not on the modal content
    if (e.target === overlayRef.current) {
      handleClose()
    }
  }, [handleClose])

  // Prevent modal content clicks from bubbling to overlay
  const handleModalClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
  }, [])

  // Handle next question navigation
  const handleNextQuestion = useCallback(() => {
    console.log('Navigating to next question:', questionId + 1)
    handleClose() // Close popup first
    setTimeout(() => {
      router.push(`/aptitude/${questionId + 1}`)
    }, 100) // Small delay to ensure popup closes first
  }, [questionId, router, handleClose])

  // Update today's aptitude questions attempted count when popup is shown
  useEffect(() => {
    const updateQuestionAttempted = async () => {
      if (isVisible && !questionAttemptedRef.current) {
        questionAttemptedRef.current = true
        try {
          const response = await fetch('/api/update/today?inc=aptitude_questions_attempted', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          })
          
          if (!response.ok) {
            console.error('Failed to update aptitude questions attempted:', response.statusText)
          } else {
            console.log('Successfully updated aptitude questions attempted count')
          }
        } catch (error) {
          console.error('Error calling update today API:', error)
        }
      }
    }

    if (isVisible) {
      updateQuestionAttempted()
    } else {
      // Reset question attempted flag when popup closes
      questionAttemptedRef.current = false
    }
  }, [isVisible])

  // Add streak when user gets correct answer (only once per popup session)
  useEffect(() => {
    const addStreak = async () => {
      if (isVisible && selectedOption === correctIndex && !isTimeUp && !streakProcessedRef.current) {
        streakProcessedRef.current = true
        try {
          const response = await fetch('/api/add/streak', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              questionId,
              isCorrect: true,
              timestamp: new Date().toISOString()
            })
          })
          
          if (!response.ok) {
            console.error('Failed to add streak:', response.statusText)
          }
        } catch (error) {
          console.error('Error calling add streak API:', error)
        }
      }
    }

    if (isVisible) {
      addStreak()
    } else {
      // Reset streak processing flag when popup closes
      streakProcessedRef.current = false
    }
  }, [isVisible, selectedOption, correctIndex, isTimeUp, questionId])

  // Don't render if not visible
  if (!isVisible) return null

  const getResultGif = () => {
    if (isTimeUp) return null
    if (selectedOption === correctIndex) return preloadedGifs.happy
    return preloadedGifs.sad
  }

  const resultGif = getResultGif()

  return (
    <>
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
      
      {/* Fixed overlay container */}
      <div 
        ref={overlayRef}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={handleOverlayClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="explanation-title"
      >
        {/* Dummy Question Layout in Background */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="min-h-screen bg-gray-50 text-black font-mono">
            {/* Dummy Header */}
            <header className="bg-white border-b border-gray-200 py-4 shadow-sm">
              <div className="max-w-full mx-auto flex justify-between items-center px-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🐾</span>
                  <h1 className="text-2xl font-light">9lives</h1>
                </div>
                
                <div className="flex items-center gap-8">
                  <div className="text-center">
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Timer</p>
                    <p className="text-sm font-light">1:30 ⏰</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Fish</p>
                    <p className="text-sm font-light">125 🐟</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Streak</p>
                    <p className="text-sm font-light">7 🔥</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Question 15</p>
                    <p className="text-sm font-light">Aptitude Mode</p>
                  </div>
                </div>
              </div>
            </header>

            {/* Dummy Main Content */}
            <main className="max-w-full mx-auto px-4 py-8">
              {/* Dummy Question */}
              <div className="mb-8">
                <div className="bg-white border border-gray-200">
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-2xl">❓</span>
                      <h3 className="font-mono font-medium text-lg">Question 15</h3>
                    </div>
                    <div className="text-gray-800 text-base leading-relaxed">
                      <p className="mb-4">If a train travels at 60 km/h and covers a distance of 180 km, how long does the journey take?</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dummy Options */}
              <div className="mb-8">
                <div className="bg-white border border-gray-200">
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <span className="text-2xl">🎯</span>
                      <h3 className="font-mono font-medium text-lg">Choose Your Answer</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {['2 hours', '3 hours', '4 hours', '5 hours'].map((option, index) => (
                        <div
                          key={index}
                          className="w-full p-4 text-left border bg-gray-50 border-gray-200 font-mono text-sm"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-start">
                              <span className="font-bold mr-3 text-gray-900 mt-1">
                                {String.fromCharCode(65 + index)}.
                              </span>
                              <div className="flex-1">
                                <p className="text-sm text-gray-700">{option}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dummy Action Buttons */}
              <div className="flex justify-center gap-4 mb-8">
                <div className="py-3 px-8 bg-gray-300 text-gray-500 border-2 border-gray-300 font-mono text-base">
                  Select an option first
                </div>
                <div className="py-3 px-6 bg-orange-100 text-orange-800 border-2 border-orange-200 font-mono text-base">
                  Show Hint 💡
                </div>
              </div>
            </main>
          </div>
        </div>

        {/* Popup Modal - Fixed size container */}
        <div 
          ref={modalRef}
          className="bg-white shadow-2xl w-full max-w-6xl h-[85vh] animate-fadeIn relative z-10 rounded-lg overflow-hidden"
          onClick={handleModalClick}
        >
          <div className="flex h-full">
            {/* Left Side - GIF and Result Summary - Fixed width, no scroll */}
            <div className="w-80 bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col border-r border-gray-200">
              {/* GIF Section - Centered */}
              <div className="flex-1 flex items-center justify-center p-6">
                {resultGif && !isTimeUp ? (
                  <div className="text-center">
                    <img 
                      src={resultGif.src}
                      alt={selectedOption === correctIndex ? "Celebration" : "Sad reaction"}
                      className={`${selectedOption === correctIndex ? "w-48 h-60" : "w-40 h-40"} object-contain mb-4 rounded-lg mx-auto`}
                      title={`GIF ${resultGif.isCached ? 'loaded from cache' : 'fetched online'}`}
                    />
                    <div className="text-center">
                      {selectedOption === correctIndex ? (
                        <div>
                          <span className="text-xl font-bold text-green-600 block mb-2">🎉 Purrfect! 🎉</span>
                          <span className="text-base text-green-700">You nailed it, cat!</span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-lg font-medium text-red-600 block mb-2">Meow worry!</span>
                          <span className="text-base text-red-700">Keep clawing at it! 🐾</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : isTimeUp ? (
                  <div className="text-center">
                    <span className="text-6xl mb-4 block">⏰</span>
                    <span className="text-xl font-bold text-red-600 block mb-2">Time's Meowt!</span>
                    <span className="text-base text-red-700">Cat luck next time!</span>
                  </div>
                ) : (
                  <div className="text-center">
                    <span className="text-5xl mb-4 block">🤔</span>
                    <span className="text-lg text-gray-600">Loading...</span>
                  </div>
                )}
              </div>
              
              {/* Result Summary - Fixed at bottom */}
              <div className="p-4">
                <div className="bg-white shadow-sm border rounded-lg p-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      {isTimeUp ? (
                        <span className="font-medium text-red-600 text-sm">⏰ Time's Meowt!</span>
                      ) : selectedOption === correctIndex ? (
                        <span className="font-medium text-green-600 text-sm">✅ Cat-solutely Correct!</span>
                      ) : (
                        <span className="font-medium text-red-600 text-sm">❌ Not Quite, Kitty</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-700">
                      {isTimeUp 
                        ? "No fish when the clock runs meowt!"
                        : selectedOption === correctIndex
                          ? "Paws-ome! You caught 5 fish! 🐟"
                          : "Fur-get about it! Practice makes purrfect."
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Explanation & Controls */}
            <div className="flex-1 flex flex-col">
              {/* Header - Fixed */}
              <div className="bg-black text-white p-4 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-xl">📝</span>
                  <h3 id="explanation-title" className="font-mono font-medium text-lg">Meow-planation</h3>
                </div>
                <button
                  onClick={handleClose}
                  className="text-white hover:text-gray-300 transition-colors p-2 rounded-full hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400"
                  title="Close explanation"
                  aria-label="Close explanation"
                  type="button"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>

              {/* Scrollable Content - This is the only scrollable part */}
              <div className="flex-1 overflow-y-auto bg-gray-50">
                <div className="p-6">
                  <div className="bg-white p-6 shadow-sm border border-gray-200 rounded-lg">
                    <div className="text-gray-800">
                      <PopupContentRenderer content={questionData.explanation} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer with Actions - Fixed */}
              <div className="bg-white border-t border-gray-200 p-4 flex-shrink-0">
                <div className="flex flex-col gap-3">
                  {/* Answer indicators */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      <span className="font-medium">Correct:</span> {String.fromCharCode(65 + correctIndex)}. {shuffledOptions[correctIndex].substring(0, 40)}{shuffledOptions[correctIndex].length > 40 ? '...' : ''}
                    </span>
                    {selectedOption !== null && selectedOption !== correctIndex && (
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                        <span className="font-medium">Your choice:</span> {String.fromCharCode(65 + selectedOption)}
                      </span>
                    )}
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={handleClose}
                      type="button"
                      className="px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors font-mono text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
                    >
                      Close
                    </button>
                    <button
                      onClick={handleNextQuestion}
                      type="button"
                      className="px-6 py-2 bg-black text-white hover:bg-gray-800 transition-colors font-mono text-sm flex items-center gap-2 shadow-sm rounded focus:outline-none focus:ring-2 focus:ring-gray-400"
                    >
                      Next Claw-tion
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
      </div>
    </>
  )
}
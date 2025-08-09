import { useRouter } from 'next/navigation'

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
            className="inline-block bg-gray-50 text-gray-800 px-2 py-1 border mx-1 font-serif text-base"
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
      
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
        <div className="bg-white shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden animate-fadeIn relative z-10">
          <div className="flex h-full">
            {/* Left Side - GIF */}
            <div className="w-1/3 bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center p-8 border-r border-gray-200">
              {resultGif && !isTimeUp ? (
                <div className="text-center">
                  <img 
                    src={resultGif.src}
                    alt={selectedOption === correctIndex ? "Celebration" : "Sad reaction"}
                    className={`${selectedOption === correctIndex ? "w-56 h-72" : "w-48 h-48"} object-contain mb-4 rounded-lg`}
                    title={`GIF ${resultGif.isCached ? 'loaded from cache' : 'fetched online'}`}
                  />
                  <div className="text-center">
                    {selectedOption === correctIndex ? (
                      <div>
                        <span className="text-2xl font-bold text-green-600 block mb-2">🎉 Purrfect! 🎉</span>
                        <span className="text-lg text-green-700">You nailed it, cat!</span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-xl font-medium text-red-600 block mb-2">Meow worry!</span>
                        <span className="text-lg text-red-700">Keep clawing at it! 🐾</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : isTimeUp ? (
                <div className="text-center">
                  <span className="text-8xl mb-4 block">⏰</span>
                  <span className="text-2xl font-bold text-red-600 block mb-2">Time's Meowt!</span>
                  <span className="text-lg text-red-700">Cat luck next time!</span>
                </div>
              ) : (
                <div className="text-center">
                  <span className="text-6xl mb-4 block">🤔</span>
                  <span className="text-xl text-gray-600">Loading...</span>
                </div>
              )}
              
              {/* Result Summary in Left Panel */}
              <div className="mt-8 p-4 bg-white shadow-sm border w-full">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    {isTimeUp ? (
                      <span className="font-medium text-red-600">⏰ Time's Meowt!</span>
                    ) : selectedOption === correctIndex ? (
                      <span className="font-medium text-green-600">✅ Cat-solutely Correct!</span>
                    ) : (
                      <span className="font-medium text-red-600">❌ Not Quite, Kitty</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-700">
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

            {/* Right Side - Explanation & Controls */}
            <div className="w-2/3 flex flex-col">
              {/* Header */}
              <div className="bg-black text-white p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📝</span>
                  <h3 className="font-mono font-medium text-xl">Meow-planation</h3>
                </div>
                <button
                  onClick={onClose}
                  className="text-white hover:text-gray-300 transition-colors p-1"
                  title="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                <div className="bg-white p-6 shadow-sm border border-gray-200">
                  <div className="text-gray-800 prose prose-sm max-w-none">
                    <MarkdownRenderer content={questionData.explanation} />
                  </div>
                </div>
              </div>

              {/* Footer with Actions */}
              <div className="bg-white border-t border-gray-200 p-6 flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-500"></span>
                    Correct: {String.fromCharCode(65 + correctIndex)}. {shuffledOptions[correctIndex].substring(0, 30)}...
                  </span>
                  {selectedOption !== null && selectedOption !== correctIndex && (
                    <span className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-red-500"></span>
                      Your choice: {String.fromCharCode(65 + selectedOption)}
                    </span>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors font-mono text-sm border border-gray-300"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => router.push(`/aptitude/${questionId + 1}`)}
                    className="px-6 py-2 bg-black text-white hover:bg-gray-800 transition-colors font-mono text-sm flex items-center gap-2 shadow-sm"
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
    </>
  )
}
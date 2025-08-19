'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface AIMLData {
  id: number
  name: string
  theory: string
}

const CodeBlock = ({ children, language = 'python' }: { children: string, language?: string }) => {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(children)
  }

  return (
    <div className="relative mb-6 group">
      <div className="bg-gray-900 text-white p-4 overflow-x-auto text-sm font-mono border border-gray-700">
        <pre className="whitespace-pre-wrap">{children}</pre>
      </div>
      <div className="absolute top-2 right-2 flex gap-2">
        <span className="bg-blue-600 text-white px-2 py-1 text-xs font-mono">
          {language.toUpperCase()}
        </span>
        <button
          onClick={copyToClipboard}
          className="bg-gray-700 text-gray-300 px-2 py-1 text-xs font-mono opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-600"
          title="Copy code"
        >
          📋
        </button>
      </div>
    </div>
  )
}

const MarkdownComponents = {
  h1: ({ children }: any) => (
    <h1 className="text-3xl font-bold mb-6 mt-8 text-gray-900 border-b-2 border-purple-500 pb-3">
      {children}
    </h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="text-2xl font-semibold mb-4 mt-8 text-gray-800 border-l-4 border-purple-400 pl-4">
      {children}
    </h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-xl font-medium mb-3 mt-6 text-gray-700">
      {children}
    </h3>
  ),
  h4: ({ children }: any) => (
    <h4 className="text-lg font-medium mb-3 mt-5 text-gray-700">
      {children}
    </h4>
  ),
  h5: ({ children }: any) => (
    <h5 className="text-base font-semibold mb-2 mt-4 text-gray-800">
      {children}
    </h5>
  ),
  h6: ({ children }: any) => (
    <h6 className="text-base font-medium mb-2 mt-3 text-gray-700">
      {children}
    </h6>
  ),
  p: ({ children }: any) => {
    const childrenStr = String(children)
    if (childrenStr.includes('**Concept') || childrenStr.includes('**Example') || childrenStr.includes('**Implementation') || childrenStr.includes('**Use Case')) {
      return (
        <div className="mb-4 text-gray-700 leading-relaxed text-base whitespace-pre-line">
          {children}
        </div>
      )
    }
    return (
      <p className="mb-4 text-gray-700 leading-relaxed text-base">
        {children}
      </p>
    )
  },
  ul: ({ children }: any) => (
    <ul className="mb-4 space-y-1 pl-6 list-disc text-gray-700">
      {children}
    </ul>
  ),
  ol: ({ children }: any) => (
    <ol className="mb-4 space-y-1 pl-6 list-decimal text-gray-700">
      {children}
    </ol>
  ),
  li: ({ children }: any) => (
    <li className="text-base text-gray-700 leading-relaxed mb-1">
      {children}
    </li>
  ),
  em: ({ children }: any) => (
    <em className="italic text-gray-800 font-medium">{children}</em>
  ),
  strong: ({ children }: any) => {
    const content = String(children)
    if (content.includes('Concept:') || content.includes('Example:') || content.includes('Implementation:') || content.includes('Use Case:')) {
      return (
        <div className="font-semibold text-gray-900 mb-2 mt-4 block">
          {content.replace(':', ':\n')}
        </div>
      )
    }
    if (content.startsWith('Concept') || content.startsWith('Example') || content.startsWith('Implementation') || content.startsWith('Use Case')) {
      return (
        <div className="font-semibold text-gray-900 mb-2 mt-4 block">
          {children}
        </div>
      )
    }
    return (
      <strong className="font-semibold text-gray-900">{children}</strong>
    )
  },
  code: ({ children, className, inline }: any) => {
    if (!inline && (className || String(children).includes('\n') || String(children).length > 50)) {
      return (
        <code className="block bg-gray-900 text-white p-4 text-sm font-mono whitespace-pre-wrap overflow-x-auto border border-gray-700">
          {children}
        </code>
      )
    }
    return (
      <code className="bg-gray-100 text-gray-800 px-2 py-1 text-sm font-mono">
        {children}
      </code>
    )
  },
  pre: ({ children }: any) => (
    <div className="relative mb-6">
      <div className="bg-gray-900 text-white p-4 overflow-x-auto text-sm font-mono border border-gray-700">
        {children}
      </div>
      <div className="absolute top-2 right-2">
        <span className="bg-blue-600 text-white px-2 py-1 text-xs font-mono">
          CODE
        </span>
      </div>
    </div>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-4 border-purple-400 bg-purple-50 pl-4 py-3 mb-4 italic text-gray-700">
      {children}
    </blockquote>
  ),
  hr: () => (
    <hr className="my-6 border-0 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
  ),
  table: ({ children }: any) => (
    <div className="mb-6 overflow-x-auto border border-gray-200 shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 bg-white">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }: any) => (
    <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
      {children}
    </thead>
  ),
  tbody: ({ children }: any) => (
    <tbody className="bg-white divide-y divide-gray-200">
      {children}
    </tbody>
  ),
  tr: ({ children }: any) => (
    <tr className="hover:bg-gray-50 transition-colors duration-150">
      {children}
    </tr>
  ),
  th: ({ children }: any) => (
    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
      {children}
    </th>
  ),
  td: ({ children }: any) => (
    <td className="px-4 py-3 text-sm text-gray-700 border-b border-gray-100 align-top">
      <div className="whitespace-pre-wrap break-words">
        {children}
      </div>
    </td>
  ),
  br: () => <br className="mb-2" />
}

interface ParsedSection {
  id: string
  title: string
  emoji: string
  content: string
  hasCodeBlocks: boolean
  hasMathFormulas: boolean
}

function processTheoryContent(theory: string): string {
  let processed = theory.replace(/\$#\s*([a-z]*)\s*\n?([\s\S]*?)\n?\s*#\$/g, (match, language, code) => {
    const lang = language.trim() || 'python'
    const cleanCode = code.trim()
    return `\`\`\`${lang}\n${cleanCode}\n\`\`\``
  })

  // Convert custom math notation to LaTeX
  processed = processed.replace(/\$O\(([^)]+)\)\$/g, '$O($1)$')
  processed = processed.replace(/\$\Omega\(([^)]+)\)\$/g, '$\\Omega($1)$')
  processed = processed.replace(/\$\Theta\(([^)]+)\)\$/g, '$\\Theta($1)$')

  return processed
}

function parseTheoryContent(theory: string): ParsedSection[] {
  const sections: ParsedSection[] = []
  
  const processedTheory = processTheoryContent(theory)
  
  // Split content by any emoji at the beginning of a line
  const emojiRegex = /^[\u{1F000}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]+/gmu
  
  // Find all lines that start with emoji
  const lines = processedTheory.split('\n')
  const sectionStarts: { lineIndex: number; emoji: string; title: string }[] = []
  
  lines.forEach((line, index) => {
    const match = line.match(emojiRegex)
    if (match) {
      const emoji = match[0]
      // Extract title from the rest of the line
      const title = line.replace(emojiRegex, '').trim()
        .replace(/^\*\*|\*\*$/g, '') // Remove markdown bold markers
        .replace(/^#+\s*/, '') // Remove markdown headers
        .trim()
      
      if (title) { // Only add if there's actual text after the emoji
        sectionStarts.push({ lineIndex: index, emoji, title })
      }
    }
  })
  
  // If we found emoji sections, process them
  if (sectionStarts.length > 0) {
    sectionStarts.forEach((sectionStart, index) => {
      const nextSectionStart = sectionStarts[index + 1]
      const startLine = sectionStart.lineIndex + 1 // Content starts after the header line
      const endLine = nextSectionStart ? nextSectionStart.lineIndex : lines.length
      
      const content = lines.slice(startLine, endLine).join('\n').trim()
      
      if (content) {
        const hasCodeBlocks = content.includes('```') || content.includes('$#')
        const hasMathFormulas = content.includes('$') || content.includes('\\(') || content.includes('\\[') || 
          /\b(algorithm|complexity|formula|equation|theorem|proof|model|neural|gradient|loss|optimization)\b/i.test(content)
        
        sections.push({
          id: `section-${index}`,
          title: sectionStart.title,
          emoji: sectionStart.emoji,
          content,
          hasCodeBlocks,
          hasMathFormulas
        })
      }
    })
  } else {
    // Fallback: create a single section with all content
    const content = processedTheory.trim()
    if (content) {
      const hasCodeBlocks = content.includes('```') || content.includes('$#')
      const hasMathFormulas = content.includes('$') || content.includes('\\(') || content.includes('\\[') || 
        /\b(algorithm|complexity|formula|equation|theorem|proof|model|neural|gradient|loss|optimization)\b/i.test(content)
      
      sections.push({
        id: 'section-0',
        title: 'Content',
        emoji: '🧠',
        content,
        hasCodeBlocks,
        hasMathFormulas
      })
    }
  }
  
  return sections
}

interface SectionCardProps {
  section: ParsedSection
  isExpanded: boolean
  onToggle: () => void
}

function SectionCard({ section, isExpanded, onToggle }: SectionCardProps) {
  return (
    <div className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
      <div 
        className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl transition-transform duration-300 hover:scale-110">
              {section.emoji}
            </span>
            <h3 className="font-mono font-medium text-lg text-gray-800 hover:text-black transition-colors">
              {section.title}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            {section.hasCodeBlocks && (
              <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 font-mono">
                🐍 Code
              </span>
            )}
            {section.hasMathFormulas && (
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 font-mono">
                🧮 Math
              </span>
            )}
            <div className={`text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
              ▼
            </div>
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="px-6 pb-6 border-t border-gray-100">
          <div className="pt-4">
            <ReactMarkdown 
              components={MarkdownComponents}
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {section.content}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}

function TimerProgressBar({ timeLeft, totalTime }: { timeLeft: number, totalTime: number }) {
  const progress = ((totalTime - timeLeft) / totalTime) * 100
  const isComplete = timeLeft === 0
  
  return (
    <div className="w-full bg-gray-200 h-2 overflow-hidden">
      <div 
        className={`h-full transition-all duration-1000 ease-linear ${
          isComplete ? 'bg-black' : 'bg-black'
        }`}
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}

function LoadingProgressBar() {
  const [progress, setProgress] = useState(0)
  
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 100
        return prev + Math.random() * 15 + 5
      })
    }, 200)
    
    return () => clearInterval(timer)
  }, [])
  
  return (
    <div className="w-64 bg-gray-200 h-2 overflow-hidden">
      <div 
        className="h-full bg-black transition-all duration-300 ease-out"
        style={{ width: `${Math.min(progress, 100)}%` }}
      />
    </div>
  )
}

function StreakDisplay({ streakData }: { streakData: any }) {
  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0]
  }

  const getYesterdayDate = () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday.toISOString().split('T')[0]
  }

  let streakDate = ''
  let streakCount = 0
  let isToday = false
  let isYesterday = false
  let shouldShowZero = false

  if (streakData && Array.isArray(streakData) && streakData.length === 2) {
    streakDate = streakData[0]
    streakCount = streakData[1] || 0
    const today = getTodayDate()
    const yesterday = getYesterdayDate()
    
    isToday = streakDate === today
    isYesterday = streakDate === yesterday
    
    if (streakDate < yesterday) {
      shouldShowZero = true
    }
  }

  const displayCount = shouldShowZero ? 0 : streakCount

  return (
    <div className="text-center">
      <p className="text-xs text-gray-400 uppercase tracking-wider">Streak</p>
      <p className={`text-xl font-normal transition-all duration-300 ${
        isToday 
          ? 'text-purple-500 animate-pulse' 
          : isYesterday 
            ? 'text-gray-600' 
            : 'text-gray-400'
      }`}>
        {displayCount} 🔥
      </p>
    </div>
  )
}

// Enhanced Brain Animation Component with floating neurons
function BrainAnimation({ isActive }: { isActive: boolean }) {
  const [neurons, setNeurons] = useState<Array<{
    id: number
    emoji: string
    x: number
    y: number
    speedX: number
    speedY: number
    angle: number
    scale: number
    opacity: number
    pulsePhase: number
  }>>([])
  const [isEnding, setIsEnding] = useState(false)

  useEffect(() => {
    if (!isActive) {
      setIsEnding(true)
      // Fade out existing neurons
      const fadeOutTimer = setTimeout(() => {
        setNeurons([])
        setIsEnding(false)
      }, 2000) // 2 second fade out
      
      return () => clearTimeout(fadeOutTimer)
    }

    setIsEnding(false)
    const neuronEmojis = ['🧠', '⚡', '💡', '🔬', '🤖', '🎯', '📊', '🔮', '🧩', '⚛️']
    
    const createNeuron = () => {      
      return {
        id: Math.random(),
        emoji: neuronEmojis[Math.floor(Math.random() * neuronEmojis.length)],
        x: Math.random() * (window.innerWidth - 100) + 50,
        y: Math.random() * (window.innerHeight - 100) + 50,
        speedX: (Math.random() - 0.5) * 2,
        speedY: (Math.random() - 0.5) * 2,
        angle: Math.random() * Math.PI * 2,
        scale: Math.random() * 0.4 + 0.8, // Scale between 0.8 and 1.2
        opacity: 0.9,
        pulsePhase: Math.random() * Math.PI * 2
      }
    }

    let animationFrame: number

    const updateNeurons = () => {
      setNeurons(prevNeurons => {
        let updatedNeurons = prevNeurons.map(neuron => {
          let newX = neuron.x + neuron.speedX
          let newY = neuron.y + neuron.speedY
          let newOpacity = neuron.opacity

          // If animation is ending, fade out the neuron
          if (isEnding) {
            newOpacity = Math.max(0, neuron.opacity - 0.02)
          }

          // Bounce off edges
          if (newX <= 30 || newX >= window.innerWidth - 70) {
            neuron.speedX = -neuron.speedX
            newX = Math.max(30, Math.min(window.innerWidth - 70, newX))
          }
          
          if (newY <= 30 || newY >= window.innerHeight - 70) {
            neuron.speedY = -neuron.speedY
            newY = Math.max(30, Math.min(window.innerHeight - 70, newY))
          }

          return {
            ...neuron,
            x: newX,
            y: newY,
            opacity: newOpacity,
            pulsePhase: neuron.pulsePhase + 0.1
          }
        })

        // Remove neurons that have faded completely
        updatedNeurons = updatedNeurons.filter(neuron => neuron.opacity > 0)

        // Add new neurons occasionally - only if not ending
        if (!isEnding && Math.random() > 0.99 && updatedNeurons.length < 12) {
          updatedNeurons.push(createNeuron())
        }

        return updatedNeurons
      })

      animationFrame = requestAnimationFrame(updateNeurons)
    }

    // Start with a few initial neurons
    const initialNeurons = Array.from({ length: 6 }, () => createNeuron())
    setNeurons(initialNeurons)

    // Start the animation loop
    animationFrame = requestAnimationFrame(updateNeurons)

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
    }
  }, [isActive, isEnding])

  if (!isActive && neurons.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-20 overflow-hidden">
      {neurons.map(neuron => (
        <div
          key={neuron.id}
          className="absolute text-3xl transition-opacity duration-100"
          style={{
            left: `${neuron.x}px`,
            top: `${neuron.y}px`,
            transform: `
              scale(${neuron.scale + Math.sin(neuron.pulsePhase) * 0.1}) 
              rotate(${neuron.angle}rad)
            `,
            opacity: neuron.opacity * (0.8 + Math.sin(neuron.pulsePhase) * 0.2),
            filter: 'drop-shadow(2px 2px 6px rgba(147,51,234,0.3))',
            zIndex: Math.floor(neuron.scale * 100)
          }}
        >
          {neuron.emoji}
        </div>
      ))}
    </div>
  )
}

export default function AIMLPage() {
  const params = useParams()
  const router = useRouter()
  const [aimlData, setAimlData] = useState<AIMLData | null>(null)
  const [parsedSections, setParsedSections] = useState<ParsedSection[]>([])
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [catAnimation, setCatAnimation] = useState('🐱')
  const [streakData, setStreakData] = useState(null)
  const [totalPoints, setTotalPoints] = useState(0)
  const [aimlStudied, setAimlStudied] = useState(0)
  const [showBrainAnimation, setShowBrainAnimation] = useState(false)
  
  const [timeLeft, setTimeLeft] = useState(240) // 4 minutes for AI/ML
  const [canProceed, setCanProceed] = useState(false)
  const [hasAttempted, setHasAttempted] = useState(false)
  const totalTime = 240

  useEffect(() => {
    const cats = ['🐱', '😸', '😹', '😻', '😽', '🙀', '😿', '😾', '🐾']
    let index = 0
    
    const interval = setInterval(() => {
      index = (index + 1) % cats.length
      setCatAnimation(cats[index])
    }, 2500)
    
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1)
      }, 1000)
      
      return () => clearTimeout(timer)
    } else if (timeLeft === 0) {
      setCanProceed(true)
      setShowBrainAnimation(true)
      
      // Stop brain animation after 10 seconds
      setTimeout(() => {
        setShowBrainAnimation(false)
      }, 10000)
      
      if (!hasAttempted) {
        updateUserProgress()
        // Call API directly when timer ends
        fetch('/api/update/today?inc=ai_ml_covered', {
          method: 'POST',
          credentials: 'include'
        }).catch(console.error)
        setHasAttempted(true)
      }
    }
  }, [timeLeft, hasAttempted])

  const getCookie = (name: string) => {
    if (typeof document === 'undefined') return null
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop()?.split(';').shift()
    return null
  }

  const fetchUserData = async () => {
    try {
      let userId = getCookie('client-user-id') || 
                  (typeof localStorage !== 'undefined' ? localStorage.getItem('client-user-id') : null) || 
                  (typeof localStorage !== 'undefined' ? localStorage.getItem('supabase-user-id') : null)
      
      if (!userId) {
        console.log('No user ID found')
        return
      }

      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('current_streak, total_points, ai_ml_covered')
        .eq('id', userId)
        .single()

      if (fetchError) {
        console.error('Failed to fetch user data:', fetchError)
        return
      }

      let parsedStreak = null
      try {
        if (userData?.current_streak) {
          if (typeof userData.current_streak === 'string') {
            parsedStreak = JSON.parse(userData.current_streak)
          } else {
            parsedStreak = userData.current_streak
          }
        }
      } catch (e) {
        console.error('Error parsing streak data:', e)
      }

      setStreakData(parsedStreak)
      setTotalPoints(userData?.total_points || 0)
      setAimlStudied(userData?.ai_ml_covered || 0)
    } catch (error) {
      console.error('Error fetching user data:', error)
    }
  }

  const updateUserProgress = async () => {
    try {
      const currentAimlId = parseInt(params.id as string)
      
      if (currentAimlId === aimlStudied + 1) {
        let userId = getCookie('client-user-id') || 
                    (typeof localStorage !== 'undefined' ? localStorage.getItem('client-user-id') : null) || 
                    (typeof localStorage !== 'undefined' ? localStorage.getItem('supabase-user-id') : null)
        
        if (userId) {
          const { error } = await supabase
            .from('users')
            .update({ 
              ai_ml_covered: currentAimlId,
              total_points: totalPoints + 4 // AI/ML gives 4 points
            })
            .eq('id', userId)

          if (!error) {
            setAimlStudied(currentAimlId)
            setTotalPoints(prev => prev + 4)
          }
        }
      }

      fetchUserData()
    } catch (error) {
      console.error('Failed to update user progress:', error)
    }
  }

  useEffect(() => {
    fetchUserData()
  }, [])

  useEffect(() => {
    const fetchAimlData = async () => {
      try {
        const { data, error } = await supabase
          .from('ai_ml')
          .select('*')
          .eq('id', params.id)
          .single()

        if (error) {
          throw error
        }

        setAimlData(data)
        
        if (data.theory) {
          const sections = parseTheoryContent(data.theory)
          setParsedSections(sections)
          
          // Auto-expand the first section (Introduction) and any overview sections
          const autoExpandSections = new Set<string>()
          sections.forEach((section, index) => {
            if (index === 0 || 
                section.title.toLowerCase().includes('introduction') ||
                section.title.toLowerCase().includes('overview') || 
                section.title.toLowerCase().includes('summary') ||
                section.title.toLowerCase().includes('definition')) {
              autoExpandSections.add(section.id)
            }
          })
          setExpandedSections(autoExpandSections)
        }
      } catch (err) {
        console.error('Error fetching AI/ML data:', err)
        setError('Failed to load AI/ML content. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchAimlData()
    }
  }, [params.id])

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
  }

  const toggleAllSections = () => {
    if (showAllSections) {
      setExpandedSections(new Set())
    } else {
      setExpandedSections(new Set(parsedSections.map(s => s.id)))
    }
    setShowAllSections(!showAllSections)
  }

  const handleNext = () => {
    if (!canProceed) return
    
    const currentId = parseInt(params.id as string)
    const nextId = currentId + 1
    router.push(`/ai-ml/${nextId}`)
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const sectionStats = {
    total: parsedSections.length,
    withCode: parsedSections.filter(s => s.hasCodeBlocks).length,
    withMath: parsedSections.filter(s => s.hasMathFormulas).length,
    expanded: expandedSections.size
  }

  const [showAllSections, setShowAllSections] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6 animate-bounce">🐱</div>
          <p className="text-gray-600 font-mono text-lg mb-6">Loading AI/ML theory...</p>
          <LoadingProgressBar />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8 bg-white shadow-lg border">
          <div className="text-6xl mb-6">😿</div>
          <h2 className="text-2xl font-mono text-gray-800 mb-4">Oops! Something went wrong</h2>
          <p className="text-gray-600 mb-8 leading-relaxed">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-purple-600 text-white font-mono hover:bg-purple-700 transition-colors shadow-md hover:shadow-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!aimlData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6">🙀</div>
          <p className="text-gray-600 font-mono text-lg">AI/ML theory not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 text-black font-mono">
      <BrainAnimation isActive={showBrainAnimation} />
      
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="py-6">
          <div className="max-w-7xl mx-auto flex justify-between items-center px-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl animate-pulse">🐾</span>
              <h1 className="text-2xl font-light"><a href='/home'>9lives</a></h1>
            </div>
            
            <div className="flex items-center gap-6">
              <StreakDisplay streakData={streakData} />
              <div className="text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Fish</p>
                <p className="text-xl text-black font-normal">{totalPoints} 🐟</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Mode</p>
                <p className="text-sm font-light text-purple-600">AI/ML Theory</p>
              </div>
            </div>
          </div>
        </div>
        
        <TimerProgressBar timeLeft={timeLeft} totalTime={totalTime} />
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-12 bg-white shadow-sm border p-8">
          <div className="text-6xl mb-8 transition-all duration-500">{catAnimation}</div>
          <h2 className="text-4xl font-light mb-6 text-gray-900">
            AI/ML Theory
          </h2>

          <div className="bg-purple-50 border-l-4 border-purple-400 p-6 mb-6">
            <h3 className="text-2xl font-medium text-purple-900 mb-2">Topic:</h3>
            <p className="text-xl text-purple-800 font-bold leading-relaxed">
              {aimlData.name}
            </p>
          </div>
          <p className="text-base text-gray-400 font-light">
            Master artificial intelligence and machine learning concepts 🧠
          </p>
          
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <div className="flex gap-4 justify-center">
              <button
                onClick={toggleAllSections}
                className="px-6 py-2 border border-gray-300 text-gray-700 font-mono text-sm hover:bg-gray-50 transition-colors"
              >
                {showAllSections ? '📁 Collapse All' : '📂 Expand All'}
              </button>
            </div>
            <div className="flex gap-4 text-sm text-gray-500 justify-center items-center">
              <span>🧠 {sectionStats.total} sections</span>
              <span>🐍 {sectionStats.withCode} with code</span>
              <span>🧮 {sectionStats.withMath} with math</span>
              <span>👁️ {sectionStats.expanded} expanded</span>
            </div>
          </div>
        </div>

        {parsedSections.length > 0 ? (
          <div className="space-y-6 mb-12">
            {parsedSections.map((section) => (
              <SectionCard
                key={section.id}
                section={section}
                isExpanded={expandedSections.has(section.id)}
                onToggle={() => toggleSection(section.id)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white shadow-sm border p-8 mb-12">
            <ReactMarkdown 
              components={MarkdownComponents}
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {processTheoryContent(aimlData.theory)}
            </ReactMarkdown>
          </div>
        )}

        <div className="text-center py-8 border-t border-gray-200 bg-white shadow-sm">
          <div className="animate-pulse text-3xl mb-4">🧠</div>
          <p className="text-lg text-gray-600 font-light mb-6">
            {canProceed ? 'Ready to explore the next AI/ML concept?' : 'Keep learning to unlock the next theory!'}
          </p>
          <div className="flex justify-center gap-6">
            <button
              onClick={() => router.back()}
              className="py-3 px-8 border border-gray-300 text-gray-700 font-mono text-base hover:bg-gray-50 transition-all duration-300 shadow-sm hover:shadow-md"
            >
              ← Back
            </button>
            <button
              onClick={handleNext}
              disabled={!canProceed}
              className={`py-3 px-10 font-mono font-bold text-base transition-all duration-300 shadow-md ${
                canProceed
                  ? 'bg-purple-600 text-white hover:bg-purple-700 hover:scale-105 hover:shadow-lg'
                  : 'bg-gray-400 text-gray-600 cursor-not-allowed'
              }`}
            >
              {canProceed ? 'Next Theory →' : `Wait ${formatTime(timeLeft)} to continue`}
            </button>
          </div>
          {canProceed && (
            <p className="text-sm text-green-600 mt-2 font-light">
              🎉 Brilliant! You've earned 4 points for mastering this AI/ML theory.
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
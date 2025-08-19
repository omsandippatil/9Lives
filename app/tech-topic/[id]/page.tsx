'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface TechTopicData {
  id: number
  name: string
  theory: string
}

const CodeBlock = ({ children, language = 'javascript' }: { children: string, language?: string }) => {
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
    const lang = language.trim() || 'javascript'
    const cleanCode = code.trim()
    return `\`\`\`${lang}\n${cleanCode}\n\`\`\``
  })

  processed = processed.replace(/\$O\(([^)]+)\)\$/g, 'O($1)')
  processed = processed.replace(/\$\Omega\(([^)]+)\)\$/g, 'Ω($1)')
  processed = processed.replace(/\$\Theta\(([^)]+)\)\$/g, 'Θ($1)')

  return processed
}

function parseTheoryContent(theory: string): ParsedSection[] {
  const sections: ParsedSection[] = []
  
  const processedTheory = processTheoryContent(theory)
  
  // Split by both markdown headings (###) and bold headings (**)
  const parts = processedTheory.split(/^(?:### |\*\*)/gm).filter(part => part.trim())
  
  parts.forEach((part, index) => {
    const lines = part.trim().split('\n')
    let titleLine = lines[0]
    
    // Handle ** headings by removing trailing **
    if (titleLine.includes('**')) {
      titleLine = titleLine.replace(/\*\*$/, '').trim()
    }
    
    // Extract emoji and title from the heading
    const emojiMatch = titleLine.match(/^([🎯📚🔧🌍📖✅❌🔍🔗🎤💡📊🎓📋⚠️🛠️💻🚀📌🔄⭐📝🎪🏠🎯🔒🌟🚫🧪📈🏗️⚙️⚡🎨🔥💎🎉🌈🎪🎭🎨🔮💫🌟⭐🎯🎪🎨🔮⚡🧮🎯⚛️🔬📐📊🎨🌟💡🧩🔎🎪🧠🌍🎯🔢🎪🔬🧮⚛️🔩🔍🎨🎪🧩🎯🎪🌟🎪🔑🎪]+)\s*(.+)/)
    let emoji = '💻'
    let title = titleLine
    
    if (emojiMatch) {
      emoji = emojiMatch[1]
      title = emojiMatch[2]
    }
    
    // Clean up title
    title = title.replace(/^#+\s*/, '').replace(/^\d+\.\s*/, '').replace(/\*\*/g, '').trim()
    
    const content = lines.slice(1).join('\n').trim()
    
    if (content) {
      const hasCodeBlocks = content.includes('```') || content.includes('$#')
      const hasMathFormulas = content.includes('$') || content.includes('\\(') || content.includes('\\[') || /\b(algorithm|complexity|formula|equation|theorem|proof)\b/i.test(content)
      
      sections.push({
        id: `section-${index}`,
        title,
        emoji,
        content,
        hasCodeBlocks,
        hasMathFormulas
      })
    }
  })
  
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
                💻 Code
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
              remarkPlugins={[remarkGfm]}
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
          ? 'text-orange-500 animate-pulse' 
          : isYesterday 
            ? 'text-gray-600' 
            : 'text-gray-400'
      }`}>
        {displayCount} 🔥
      </p>
    </div>
  )
}

// Enhanced Fish Animation Component with smooth full-screen movement and fade out
function FishAnimation({ isActive }: { isActive: boolean }) {
  const [fishes, setFishes] = useState<Array<{
    id: number
    emoji: string
    x: number
    y: number
    speedX: number
    speedY: number
    directionX: number
    directionY: number
    angle: number
    scale: number
    opacity: number
  }>>([])
  const [isEnding, setIsEnding] = useState(false)

  useEffect(() => {
    if (!isActive) {
      setIsEnding(true)
      // Fade out existing fishes
      const fadeOutTimer = setTimeout(() => {
        setFishes([])
        setIsEnding(false)
      }, 2000) // 2 second fade out
      
      return () => clearTimeout(fadeOutTimer)
    }

    setIsEnding(false)
    const fishEmojis = ['🐟', '🐠', '🐡', '🦈', '🐙', '🦞', '🦀', '🐋', '🐬', '🦑']
    
    const createFish = () => {
      const startFromLeft = Math.random() > 0.5
      const angle = (Math.random() - 0.5) * Math.PI * 0.4 // Random angle between -36 to +36 degrees
      
      return {
        id: Math.random(),
        emoji: fishEmojis[Math.floor(Math.random() * fishEmojis.length)],
        x: startFromLeft ? -80 : window.innerWidth + 80,
        y: Math.random() * (window.innerHeight - 100) + 50,
        speedX: Math.random() * 2 + 1.5, // Speed between 1.5 and 3.5
        speedY: Math.random() * 1 + 0.5, // Vertical speed between 0.5 and 1.5
        directionX: startFromLeft ? 1 : -1,
        directionY: Math.random() > 0.5 ? 1 : -1,
        angle: angle,
        scale: Math.random() * 0.5 + 0.8, // Scale between 0.8 and 1.3
        opacity: 0.85
      }
    }

    let animationFrame: number

    const updateFishes = () => {
      setFishes(prevFishes => {
        let updatedFishes = prevFishes.map(fish => {
          let newX = fish.x + (fish.speedX * fish.directionX)
          let newY = fish.y + (fish.speedY * fish.directionY * Math.sin(fish.angle))
          let newDirectionY = fish.directionY
          let newAngle = fish.angle
          let newOpacity = fish.opacity

          // If animation is ending, fade out the fish
          if (isEnding) {
            newOpacity = Math.max(0, fish.opacity - 0.02)
          }

          // Bounce off top and bottom edges with smooth curve
          if (newY <= 30 || newY >= window.innerHeight - 70) {
            newDirectionY = -fish.directionY
            newAngle = -fish.angle
            newY = Math.max(30, Math.min(window.innerHeight - 70, newY))
          }

          // Add slight wave motion
          newY += Math.sin(Date.now() * 0.001 + fish.id) * 0.3

          return {
            ...fish,
            x: newX,
            y: newY,
            directionY: newDirectionY,
            angle: newAngle,
            opacity: newOpacity
          }
        })

        // Remove fishes that have gone off screen or faded completely
        updatedFishes = updatedFishes.filter(fish => 
          fish.x > -100 && fish.x < window.innerWidth + 100 && fish.opacity > 0
        )

        // Add new fish occasionally (more controlled spawning) - only if not ending
        if (!isEnding && Math.random() > 0.985 && updatedFishes.length < 8) {
          updatedFishes.push(createFish())
        }

        return updatedFishes
      })

      animationFrame = requestAnimationFrame(updateFishes)
    }

    // Start with a few initial fishes
    const initialFishes = Array.from({ length: 3 }, () => createFish())
    setFishes(initialFishes)

    // Start the animation loop
    animationFrame = requestAnimationFrame(updateFishes)

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
      }
    }
  }, [isActive, isEnding])

  if (!isActive && fishes.length === 0) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-20 overflow-hidden">
      {fishes.map(fish => (
        <div
          key={fish.id}
          className="absolute text-3xl transition-opacity duration-100"
          style={{
            left: `${fish.x}px`,
            top: `${fish.y}px`,
            transform: `
              scale(${fish.scale}) 
              scaleX(${fish.directionX}) 
              rotate(${fish.angle * 20}deg)
            `,
            opacity: fish.opacity,
            filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.1))',
            zIndex: Math.floor(fish.scale * 100)
          }}
        >
          {fish.emoji}
        </div>
      ))}
    </div>
  )
}

export default function TechTopicsPage() {
  const params = useParams()
  const router = useRouter()
  const [topicData, setTopicData] = useState<TechTopicData | null>(null)
  const [parsedSections, setParsedSections] = useState<ParsedSection[]>([])
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [catAnimation, setCatAnimation] = useState('😺')
  const [streakData, setStreakData] = useState(null)
  const [totalPoints, setTotalPoints] = useState(0)
  const [showAllSections, setShowAllSections] = useState(false)
  const [techTopicsStudied, setTechTopicsStudied] = useState(0)
  const [showFishAnimation, setShowFishAnimation] = useState(false)
  
  const [timeLeft, setTimeLeft] = useState(120) // 2 minutes for tech topics
  const [canProceed, setCanProceed] = useState(false)
  const [hasAttempted, setHasAttempted] = useState(false)
  const totalTime = 120

  useEffect(() => {
    const cats = ['😺', '😸', '😹', '😻', '😽', '🙀', '😿', '😾', '🐱']
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
      setShowFishAnimation(true)
      
      // Stop fish animation after 8 seconds for smoother experience
      setTimeout(() => {
        setShowFishAnimation(false)
      }, 8000)
      
      if (!hasAttempted) {
        updateUserProgress()
        // Call API directly when timer ends
        fetch('/api/update/today?inc=tech_topics_covered', {
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
        .select('current_streak, total_points, tech_topics_covered')
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
      setTechTopicsStudied(userData?.tech_topics_covered || 0)
    } catch (error) {
      console.error('Error fetching user data:', error)
    }
  }

  const updateUserProgress = async () => {
    try {
      const currentTopicId = parseInt(params.id as string)
      
      if (currentTopicId === techTopicsStudied + 1) {
        let userId = getCookie('client-user-id') || 
                    (typeof localStorage !== 'undefined' ? localStorage.getItem('client-user-id') : null) || 
                    (typeof localStorage !== 'undefined' ? localStorage.getItem('supabase-user-id') : null)
        
        if (userId) {
          const { error } = await supabase
            .from('users')
            .update({ 
              tech_topics_covered: currentTopicId,
              total_points: totalPoints + 2 // Tech topics give 2 points
            })
            .eq('id', userId)

          if (!error) {
            setTechTopicsStudied(currentTopicId)
            setTotalPoints(prev => prev + 2)
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
    const fetchTopicData = async () => {
      try {
        const { data, error } = await supabase
          .from('tech_topics')
          .select('*')
          .eq('id', params.id)
          .single()

        if (error) {
          throw error
        }

        setTopicData(data)
        
        if (data.theory) {
          const sections = parseTheoryContent(data.theory)
          setParsedSections(sections)
          
          // Auto-expand the first section (Core Concept) and any overview sections
          const autoExpandSections = new Set<string>()
          sections.forEach((section, index) => {
            if (index === 0 || 
                section.title.toLowerCase().includes('core concept') ||
                section.title.toLowerCase().includes('introduction') ||
                section.title.toLowerCase().includes('overview') || 
                section.title.toLowerCase().includes('summary')) {
              autoExpandSections.add(section.id)
            }
          })
          setExpandedSections(autoExpandSections)
        }
      } catch (err) {
        console.error('Error fetching topic data:', err)
        setError('Failed to load tech topic content. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchTopicData()
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
    router.push(`/tech-topic/${nextId}`)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6 animate-bounce">🐱</div>
          <p className="text-gray-600 font-mono text-lg mb-6">Loading tech topic...</p>
          <LoadingProgressBar />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8 bg-white shadow-lg border">
          <div className="text-6xl mb-6">😿</div>
          <h2 className="text-2xl font-mono text-gray-800 mb-4">Oops! Something went wrong</h2>
          <p className="text-gray-600 mb-8 leading-relaxed">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-black text-white font-mono hover:bg-gray-800 transition-colors shadow-md hover:shadow-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (!topicData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6">🙀</div>
          <p className="text-gray-600 font-mono text-lg">Tech topic not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-black font-mono">
      <FishAnimation isActive={showFishAnimation} />
      
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
                <p className="text-sm font-light text-green-600">Tech</p>
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
            Tech Topic
          </h2>

          <div className="bg-green-50 border-l-4 border-green-400 p-6 mb-6">
            <h3 className="text-2xl font-medium text-green-900 mb-2">Topic:</h3>
            <p className="text-xl text-green-800 font-bold leading-relaxed">
              {topicData.name}
            </p>
          </div>
          <p className="text-base text-gray-400 font-light">
            Master technical concepts, build engineering skills 💻
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
              <span>📚 {sectionStats.total} sections</span>
              <span>💻 {sectionStats.withCode} with code</span>
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
              remarkPlugins={[remarkGfm]}
            >
              {processTheoryContent(topicData.theory)}
            </ReactMarkdown>
          </div>
        )}

        <div className="text-center py-8 border-t border-gray-200 bg-white shadow-sm">
          <div className="animate-pulse text-3xl mb-4">💻</div>
          <p className="text-lg text-gray-600 font-light mb-6">
            {canProceed ? 'Ready to explore the next tech topic?' : 'Keep learning to unlock the next topic!'}
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
                  ? 'bg-black text-white hover:bg-gray-800 hover:scale-105 hover:shadow-lg'
                  : 'bg-gray-400 text-gray-600 cursor-not-allowed'
              }`}
            >
              {canProceed ? 'Next Topic →' : `Wait ${formatTime(timeLeft)} to continue`}
            </button>
          </div>
          {canProceed && (
            <p className="text-sm text-green-600 mt-2 font-light">
              🎉 Excellent! You've earned 2 points for studying this tech topic.
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
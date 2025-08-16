'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface JavaTheoryData {
  id: number
  concept: string
  theory: string
}

// Enhanced code block component with syntax highlighting simulation
const CodeBlock = ({ children, language = 'java' }: { children: string, language?: string }) => {
  const copyToClipboard = () => {
    navigator.clipboard.writeText(children)
    // Could add toast notification here
  }

  return (
    <div className="relative mb-6 group">
      <div className="bg-gray-900 text-white p-4 overflow-x-auto text-sm font-mono border border-gray-700">
        <pre className="whitespace-pre-wrap">{children}</pre>
      </div>
      <div className="absolute top-2 right-2 flex gap-2">
        <span className="bg-green-600 text-white px-2 py-1 text-xs font-mono">
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

// Enhanced components for react-markdown with proper rendering
const MarkdownComponents = {
  h1: ({ children }: any) => (
    <h1 className="text-3xl font-bold mb-6 mt-8 text-gray-900 border-b-2 border-blue-500 pb-3">
      {children}
    </h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="text-2xl font-semibold mb-4 mt-8 text-gray-800 border-l-4 border-blue-400 pl-4">
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
    // Check if paragraph contains strong elements (like Q&A format)
    const childrenStr = String(children)
    if (childrenStr.includes('**Question') || childrenStr.includes('**Answer') || childrenStr.includes('**Problem') || childrenStr.includes('**Solution')) {
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
    // Special styling for Q&A format - handle colons properly
    if (content.includes('Question:') || content.includes('Answer:') || content.includes('Problem:') || content.includes('Solution:')) {
      return (
        <div className="font-semibold text-gray-900 mb-2 mt-4 block">
          {content.replace(':', ':\n')}
        </div>
      )
    }
    if (content.startsWith('Question') || content.startsWith('Answer') || content.startsWith('Problem') || content.startsWith('Solution')) {
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
    // Block code (inside pre tags or with language class)
    if (!inline && (className || String(children).includes('\n') || String(children).length > 50)) {
      return (
        <code className="block bg-gray-900 text-white p-4 text-sm font-mono whitespace-pre-wrap overflow-x-auto border border-gray-700">
          {children}
        </code>
      )
    }
    // Inline code
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
        <span className="bg-green-600 text-white px-2 py-1 text-xs font-mono">
          JAVA
        </span>
      </div>
    </div>
  ),
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-4 border-blue-400 bg-blue-50 pl-4 py-3 mb-4 italic text-gray-700">
      {children}
    </blockquote>
  ),
  hr: () => (
    <hr className="my-6 border-0 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent" />
  ),
  // Enhanced table components with better styling
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
  hasComplexity: boolean
}

// Function to process the theory content and handle code blocks
function processTheoryContent(theory: string): string {
  // Fixed regex pattern to properly match $# and #$ with better handling of the dollar sign
  let processed = theory.replace(/\$#\s*([a-z]*)\s*\n?([\s\S]*?)\n?\s*#\$/g, (match, language, code) => {
    const lang = language.trim() || 'java'
    const cleanCode = code.trim()
    return `\`\`\`${lang}\n${cleanCode}\n\`\`\``
  })

  // Handle mathematical complexity notation
  processed = processed.replace(/\$O\(([^)]+)\)\$/g, 'O($1)')
  processed = processed.replace(/\$\Omega\(([^)]+)\)\$/g, 'Ω($1)')
  processed = processed.replace(/\$\Theta\(([^)]+)\)\$/g, 'Θ($1)')

  return processed
}

function parseTheoryContent(theory: string): ParsedSection[] {
  const sections: ParsedSection[] = []
  
  // Process the theory content first
  const processedTheory = processTheoryContent(theory)
  
  // Split content by h2 headers (## sections)
  const parts = processedTheory.split(/^## /gm).filter(part => part.trim())
  
  parts.forEach((part, index) => {
    const lines = part.trim().split('\n')
    const titleLine = lines[0]
    
    // Extract emoji and title - enhanced pattern to catch more emojis
    const emojiMatch = titleLine.match(/^([🎯📚🔧🌍📖✅❌🔍🔗🎤💡📊🎓📋⚠️🛠️💻🚀📌🔄⭐📝🎪🏠🎯]+)\s*(.+)/)
    let emoji = '📖'
    let title = titleLine
    
    if (emojiMatch) {
      emoji = emojiMatch[1]
      title = emojiMatch[2]
    }
    
    // Clean title
    title = title.replace(/^#+\s*/, '').trim()
    
    // Get content (everything after the title)
    const content = lines.slice(1).join('\n').trim()
    
    if (content) {
      // Check if section has code blocks or complexity notation
      const hasCodeBlocks = content.includes('```') || content.includes('$#')
      const hasComplexity = content.includes('O(') || content.includes('Ω(') || content.includes('Θ(')
      
      sections.push({
        id: `section-${index}`,
        title,
        emoji,
        content,
        hasCodeBlocks,
        hasComplexity
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
            {/* Section badges */}
            {section.hasCodeBlocks && (
              <span className="px-2 py-1 text-xs bg-green-100 text-green-700 font-mono">
                💻 Code
              </span>
            )}
            {section.hasComplexity && (
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 font-mono">
                📊 Math
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

// Enhanced Fish Animation Component
function FishAnimation({ show }: { show: boolean }) {
  if (!show) return null
  
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {/* Multiple fish for better animation */}
      <div className="absolute top-1/2 -left-20 animate-[fishSwim_4s_ease-out_forwards]">
        <div className="text-4xl transform rotate-0 hover:scale-110 transition-transform">🐠</div>
      </div>
      <div className="absolute top-1/3 -left-20 animate-[fishSwim_4.5s_ease-out_0.3s_forwards]">
        <div className="text-3xl transform rotate-12">🐟</div>
      </div>
      <div className="absolute top-2/3 -left-20 animate-[fishSwim_3.8s_ease-out_0.6s_forwards]">
        <div className="text-3xl transform -rotate-6">🎣</div>
      </div>
      
      {/* Floating bubbles */}
      <div className="absolute top-1/2 left-1/4 animate-[bubble_2s_ease-out_1s_forwards]">
        <div className="text-lg opacity-70">💧</div>
      </div>
      <div className="absolute top-1/3 left-1/3 animate-[bubble_2.2s_ease-out_1.2s_forwards]">
        <div className="text-sm opacity-60">💧</div>
      </div>
      <div className="absolute top-2/3 left-2/3 animate-[bubble_1.8s_ease-out_1.5s_forwards]">
        <div className="text-base opacity-50">💧</div>
      </div>
      
      <style jsx>{`
        @keyframes fishSwim {
          0% {
            transform: translateX(0) translateY(0) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateX(calc(100vw + 100px)) translateY(-30px) rotate(15deg);
            opacity: 0;
          }
        }
        
        @keyframes bubble {
          0% {
            transform: translateY(0) scale(0);
            opacity: 0;
          }
          20% {
            opacity: 0.8;
            transform: scale(1);
          }
          100% {
            transform: translateY(-100px) scale(0.3);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}

// Timer Progress Bar Component
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

// Loading Progress Bar Component
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

// Enhanced Streak Display Component
function StreakDisplay({ streakData }: { streakData: any }) {
  // Helper function to get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0]
  }

  // Helper function to get yesterday's date in YYYY-MM-DD format
  const getYesterdayDate = () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday.toISOString().split('T')[0]
  }

  // Parse streak data - should be like ["2025-08-15", 3]
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
    
    // Show zero if the date is before yesterday
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

export default function JavaTheoryPage() {
  const params = useParams()
  const router = useRouter()
  const [theoryData, setTheoryData] = useState<JavaTheoryData | null>(null)
  const [parsedSections, setParsedSections] = useState<ParsedSection[]>([])
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [catAnimation, setCatAnimation] = useState('😺')
  const [streakData, setStreakData] = useState(null)
  const [totalPoints, setTotalPoints] = useState(0)
  const [showAllSections, setShowAllSections] = useState(false)
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState(180) // 3 minutes in seconds
  const [canProceed, setCanProceed] = useState(false)
  const [hasAttempted, setHasAttempted] = useState(false)
  const [showFishAnimation, setShowFishAnimation] = useState(false)
  const totalTime = 180

  useEffect(() => {
    // Cat animation
    const cats = ['😺', '😸', '😹', '😻', '😽', '🙀', '😿', '😾', '🐱']
    let index = 0
    
    const interval = setInterval(() => {
      index = (index + 1) % cats.length
      setCatAnimation(cats[index])
    }, 2500)
    
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Timer countdown
    if (timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1)
      }, 1000)
      
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && !hasAttempted) {
      // Timer finished, award point and allow navigation
      setCanProceed(true)
      addPointsToUser()
      // Fish animation will be triggered inside addPointsToUser() function
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
        .select('current_streak, total_points')
        .eq('id', userId)
        .single()

      if (fetchError) {
        console.error('Failed to fetch user data:', fetchError)
        return
      }

      // Parse current_streak which should be in JSON format like ["2025-08-15", 3]
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
    } catch (error) {
      console.error('Error fetching user data:', error)
    }
  }

  const addPointsToUser = async () => {
    if (!hasAttempted) {
      try {
        // Get user ID
        let userId = getCookie('client-user-id') || 
                    (typeof localStorage !== 'undefined' ? localStorage.getItem('client-user-id') : null) || 
                    (typeof localStorage !== 'undefined' ? localStorage.getItem('supabase-user-id') : null)
        
        if (!userId) {
          console.error('User not authenticated')
          setTotalPoints(prev => prev + 1) // Still increment locally
          setHasAttempted(true)
          return
        }

        const currentTheoryId = parseInt(params.id as string)
        console.log('Checking sequential access for theory ID:', currentTheoryId)

        // Get current java_lang_covered value
        const { data: userData, error: fetchError } = await supabase
          .from('users')
          .select('java_lang_covered')
          .eq('id', userId)
          .single()

        if (fetchError) {
          console.error('Failed to fetch user data:', fetchError)
          throw fetchError
        }

        const currentProgress = userData?.java_lang_covered || 0
        console.log('Current progress:', currentProgress, 'Theory ID:', currentTheoryId)

        // Check if this is the next theory in sequence
        // Only increment if current theory ID is exactly the next one expected
        const expectedNextId = currentProgress + 1
        
        if (currentTheoryId === expectedNextId) {
          console.log('Sequential access confirmed. Updating progress.')
          
          // Update java_lang_covered in users table
          const { error: updateError } = await supabase
            .from('users')
            .update({ 
              java_lang_covered: currentTheoryId
            })
            .eq('id', userId)

          if (updateError) {
            console.error('Failed to update java_lang_covered:', updateError)
          } else {
            console.log('Successfully updated java_lang_covered to:', currentTheoryId)
          }

          // Call the new API endpoint to update today's java_lang_covered
          try {
            const todayUpdateResponse = await fetch('/api/update/today?inc=java_lang_covered', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              credentials: 'include'
            });
            
            if (todayUpdateResponse.ok) {
              console.log('Successfully updated today\'s java_lang_covered count')
            } else {
              console.error('Failed to update today\'s java_lang_covered count:', todayUpdateResponse.statusText)
            }
          } catch (error) {
            console.error('Error calling today update API:', error)
          }

          // Also call the original API for points
          const response = await fetch('/api/add/points', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ points: 1 }),
            credentials: 'include'
          });
          
          if (response.ok) {
            setTotalPoints(prev => prev + 1)
            // Refresh user data to get updated streak and points
            fetchUserData()
            // Show fish animation when points are earned
            setShowFishAnimation(true)
            setTimeout(() => {
              setShowFishAnimation(false)
            }, 4000)
          } else {
            // Still increment locally for demo purposes
            setTotalPoints(prev => prev + 1)
          }
        } else if (currentTheoryId <= currentProgress) {
          console.log('Theory already completed. No progress update needed.')
          // User is revisiting a completed theory - no progress update
        } else {
          console.log('Non-sequential access detected. Progress not updated.')
          console.log(`Expected theory ID: ${expectedNextId}, but accessed: ${currentTheoryId}`)
          // User is trying to skip ahead - don't update progress but still allow completion for demo
          setTotalPoints(prev => prev + 1)
        }
      } catch (error) {
        console.error('Failed to update user progress:', error)
        // Still increment locally for demo purposes
        setTotalPoints(prev => prev + 1)
      } finally {
        setHasAttempted(true)
      }
    }
  }

  useEffect(() => {
    // Fetch user data on component mount
    fetchUserData()
  }, [])

  useEffect(() => {
    const fetchTheoryData = async () => {
      try {
        const { data, error } = await supabase
          .from('java_lang_theory')
          .select('*')
          .eq('id', params.id)
          .single()

        if (error) {
          throw error
        }

        setTheoryData(data)
        
        // Parse the theory content into sections with enhanced processing
        if (data.theory) {
          const sections = parseTheoryContent(data.theory)
          setParsedSections(sections)
          
          // Auto-expand the first section (Overview) and any section with "Quick Overview"
          const autoExpandSections = new Set<string>()
          sections.forEach((section, index) => {
            if (index === 0 || section.title.toLowerCase().includes('overview') || section.title.toLowerCase().includes('quick')) {
              autoExpandSections.add(section.id)
            }
          })
          setExpandedSections(autoExpandSections)
        }
      } catch (err) {
        console.error('Error fetching theory data:', err)
        setError('Failed to load theory content. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    if (params.id) {
      fetchTheoryData()
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
    
    // Navigate to next theory section (current id + 1)
    const currentId = parseInt(params.id as string)
    const nextId = currentId + 1
    router.push(`/languages/java/${nextId}`)
  }

  // Format timer display
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Calculate section statistics
  const sectionStats = {
    total: parsedSections.length,
    withCode: parsedSections.filter(s => s.hasCodeBlocks).length,
    withComplexity: parsedSections.filter(s => s.hasComplexity).length,
    expanded: expandedSections.size
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6 animate-bounce">🐱</div>
          <p className="text-gray-600 font-mono text-lg mb-6">Loading theory content...</p>
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

  if (!theoryData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6">🙀</div>
          <p className="text-gray-600 font-mono text-lg">Theory content not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 text-black font-mono">
      {/* Fish Animation */}
      <FishAnimation show={showFishAnimation} />
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        {/* Main Header Content */}
        <div className="py-6">
          <div className="max-w-7xl mx-auto flex justify-between items-center px-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl animate-pulse">🐾</span>
              <h1 className="text-2xl font-light">9lives</h1>
            </div>
            
            <div className="flex items-center gap-6">
              <StreakDisplay streakData={streakData} />
              <div className="text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Fish</p>
                <p className="text-xl text-black font-normal">{totalPoints} 🐟</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Mode</p>
                <p className="text-sm font-light text-green-600">Theory</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Timer Progress Bar - moved below header */}
        <TimerProgressBar timeLeft={timeLeft} totalTime={totalTime} />
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Topic Header */}
        <div className="text-center mb-12 bg-white shadow-sm border p-8">
          <div className="text-6xl mb-8 transition-all duration-500">{catAnimation}</div>
          <h2 className="text-5xl font-light mb-6 text-gray-900">
            {theoryData.concept}
          </h2>
          <p className="text-xl text-gray-600 font-light mb-4">
            Master Java fundamentals, one paw at a time
          </p>
          <p className="text-base text-gray-400 font-light">
            Knowledge is purr-power 🐾
          </p>
          
          {/* Enhanced Section Controls with Stats */}
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
              <span>📊 {sectionStats.withComplexity} with math</span>
              <span>👁️ {sectionStats.expanded} expanded</span>
            </div>
          </div>
        </div>

        {/* Content Sections */}
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
              {processTheoryContent(theoryData.theory)}
            </ReactMarkdown>
          </div>
        )}

        {/* Navigation Footer */}
        <div className="text-center py-8 border-t border-gray-200 bg-white shadow-sm">
          <div className="animate-pulse text-3xl mb-4">🐱‍🏫</div>
          <p className="text-lg text-gray-600 font-light mb-6">
            {canProceed ? 'Ready to put theory into practice?' : 'Keep reading to unlock the next section!'}
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
              className={`py-3 px-10 font-mono text-base transition-all duration-300 shadow-md ${
                canProceed
                  ? 'bg-green-600 text-white hover:bg-green-700 hover:scale-105 hover:shadow-lg'
                  : 'bg-gray-400 text-gray-600 cursor-not-allowed'
              }`}
            >
              {canProceed ? 'Next: Practice Questions →' : `Wait ${formatTime(timeLeft)} to continue`}
            </button>
          </div>
          {canProceed && (
            <p className="text-sm text-green-600 mt-2 font-light">
              🎉 Great job! You've earned a point for completing this section.
            </p>
          )}
        </div>
      </main>
    </div>
  )
}
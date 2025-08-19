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

interface PythonTheoryData {
  id: number
  concept: string
  theory: string
}

// Enhanced code block component with syntax highlighting simulation
const CodeBlock = ({ children, language = 'python' }: { children: string, language?: string }) => {
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
        <span className="bg-blue-600 text-white px-2 py-1 text-xs font-mono">
          PYTHON
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
    const lang = language.trim() || 'python'
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
    const emojiMatch = titleLine.match(/^([🎯📚🔧🌍📖✅❌🔍🔗🎤💡📊🎓📋⚠️🛠️💻🚀📌🔄⭐📝🎪🏠🎯🐍]+)\s*(.+)/)
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
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 font-mono">
                🐍 Code
              </span>
            )}
            {section.hasComplexity && (
              <span className="px-2 py-1 text-xs bg-green-100 text-green-700 font-mono">
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

// Enhanced Snake Animation Component
function SnakeAnimation({ show }: { show: boolean }) {
  if (!show) return null
  
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {/* Multiple snakes for better animation */}
      <div className="absolute top-1/2 -left-20 animate-[snakeSlither_4s_ease-out_forwards]">
        <div className="text-4xl transform rotate-0 hover:scale-110 transition-transform">🐍</div>
      </div>
      <div className="absolute top-1/3 -left-20 animate-[snakeSlither_4.5s_ease-out_0.3s_forwards]">
        <div className="text-3xl transform rotate-12">🐲</div>
      </div>
      <div className="absolute top-2/3 -left-20 animate-[snakeSlither_3.8s_ease-out_0.6s_forwards]">
        <div className="text-3xl transform -rotate-6">🎯</div>
      </div>
      
      {/* Floating sparkles */}
      <div className="absolute top-1/2 left-1/4 animate-[sparkle_2s_ease-out_1s_forwards]">
        <div className="text-lg opacity-70">✨</div>
      </div>
      <div className="absolute top-1/3 left-1/3 animate-[sparkle_2.2s_ease-out_1.2s_forwards]">
        <div className="text-sm opacity-60">⭐</div>
      </div>
      <div className="absolute top-2/3 left-2/3 animate-[sparkle_1.8s_ease-out_1.5s_forwards]">
        <div className="text-base opacity-50">💫</div>
      </div>
      
      <style jsx>{`
        @keyframes snakeSlither {
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
        
        @keyframes sparkle {
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

// Timer Progress Bar Component - moved to separate component for reuse
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

// Fixed Smart Streak Display Component
function SmartStreakDisplay({ streakData }: { streakData: [string, number] }) {
  const [lastUpdateDate, streakCount] = streakData
  
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0]
  
  // Get yesterday's date
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]
  
  // Determine display logic based on last update date
  let displayCount = streakCount
  let textColor = 'text-black'
  let isActive = false
  
  if (lastUpdateDate === today) {
    // Updated today - show in color
    textColor = 'text-orange-500'
    isActive = true
  } else if (lastUpdateDate === yesterdayStr) {
    // Updated yesterday - show current count in grayscale (streak still valid)
    textColor = 'text-gray-400'
  } else if (lastUpdateDate < yesterdayStr) {
    // Updated before yesterday - streak is broken, show as zero
    displayCount = 0
    textColor = 'text-gray-300'
  }
  
  return (
    <div className="text-center">
      <p className="text-xs text-gray-400 uppercase tracking-wider">Streak</p>
      <div className="flex items-center justify-center gap-1">
        <p className={`text-xl font-normal transition-colors duration-300 ${textColor} ${isActive ? 'animate-pulse' : ''}`}>
          {displayCount}
        </p>
        <span className={`transition-all duration-300 ${isActive ? 'animate-bounce' : displayCount === 0 ? 'grayscale opacity-30' : 'grayscale'}`}>🔥</span>
      </div>
    </div>
  )
}

// Helper function to safely parse JSONB streak data
function parseStreakData(streakValue: any): [string, number] {
  // Handle different possible formats
  if (Array.isArray(streakValue)) {
    // Already parsed array
    if (streakValue.length === 2 && typeof streakValue[0] === 'string' && typeof streakValue[1] === 'number') {
      return [streakValue[0], streakValue[1]]
    }
  } else if (typeof streakValue === 'string') {
    try {
      // Parse JSON string
      const parsed = JSON.parse(streakValue)
      if (Array.isArray(parsed) && parsed.length === 2 && typeof parsed[0] === 'string' && typeof parsed[1] === 'number') {
        return [parsed[0], parsed[1]]
      }
    } catch (e) {
      console.error('Error parsing streak JSON string:', e)
    }
  } else if (streakValue && typeof streakValue === 'object') {
    // Handle object format (though not expected)
    if (streakValue[0] && streakValue[1] !== undefined) {
      return [String(streakValue[0]), Number(streakValue[1]) || 0]
    }
  }
  
  // Fallback to default
  const today = new Date().toISOString().split('T')[0]
  return [today, 0]
}

// Helper function to update streak data properly
async function updateStreakInDatabase(userId: string, newStreakData: [string, number]) {
  try {
    // Update the streak data in the database
    const { error } = await supabase
      .from('users')
      .update({ 
        current_streak: JSON.stringify(newStreakData)
      })
      .eq('id', userId)

    if (error) {
      console.error('Failed to update streak data:', error)
      return false
    }
    
    console.log('Successfully updated streak data:', newStreakData)
    return true
  } catch (error) {
    console.error('Error updating streak data:', error)
    return false
  }
}

export default function PythonTheoryPage() {
  const params = useParams()
  const router = useRouter()
  const [theoryData, setTheoryData] = useState<PythonTheoryData | null>(null)
  const [parsedSections, setParsedSections] = useState<ParsedSection[]>([])
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [catAnimation, setCatAnimation] = useState('😺')
  const [streakData, setStreakData] = useState<[string, number]>(['2025-08-16', 0])
  const [fishCount, setFishCount] = useState(0)
  const [showAllSections, setShowAllSections] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState(180) // 3 minutes in seconds
  const [canProceed, setCanProceed] = useState(false)
  const [hasAttempted, setHasAttempted] = useState(false)
  const [showSnakeAnimation, setShowSnakeAnimation] = useState(false)
  const [isValidProgression, setIsValidProgression] = useState(false)
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
      // Timer finished, call API and allow navigation
      setCanProceed(true)
      updatePythonLangCovered()
      setShowSnakeAnimation(true)
      
      // Hide snake animation after 4 seconds
      setTimeout(() => {
        setShowSnakeAnimation(false)
      }, 4000)
    }
  }, [timeLeft, hasAttempted])

  const getCookie = (name: string) => {
    if (typeof document === 'undefined') return null
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) return parts.pop()?.split(';').shift()
    return null
  }

  // Check if this is a valid sequential progression
  const checkValidProgression = async (currentTheoryId: number, userId: string) => {
    try {
      const { data: userData, error } = await supabase
        .from('users')
        .select('python_lang_covered')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Failed to fetch user progress:', error)
        return false
      }

      const currentProgress = userData?.python_lang_covered || 0
      
      // Valid if this is the next theory in sequence (current progress + 1)
      // OR if this is the first theory (id 1) and user hasn't completed any
      const isValid = (currentTheoryId === currentProgress + 1) || 
                     (currentTheoryId === 1 && currentProgress === 0)
      
      console.log(`Theory ID: ${currentTheoryId}, Current Progress: ${currentProgress}, Valid: ${isValid}`)
      
      return isValid
    } catch (error) {
      console.error('Error checking progression validity:', error)
      return false
    }
  }

  const updatePythonLangCovered = async () => {
    if (!hasAttempted && isValidProgression) {
      try {
        console.log('Calling API to update python_lang_covered')

        // Call the new API endpoint
        const response = await fetch('/api/update/today?inc=python_lang_covered', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        });
        
        if (response.ok) {
          const result = await response.json()
          console.log('Successfully updated python_lang_covered:', result)
          
          // Update local fish count if points were also awarded
          if (result.total_points !== undefined) {
            setFishCount(result.total_points)
          }
        } else {
          const errorData = await response.json()
          console.error('Failed to update python_lang_covered:', errorData)
          
          // Still increment fish count locally for demo purposes
          setFishCount(prev => prev + 1)
        }
      } catch (error) {
        console.error('Error calling update API:', error)
        // Still increment fish count locally for demo purposes
        setFishCount(prev => prev + 1)
      } finally {
        setHasAttempted(true)
      }
    } else if (!isValidProgression) {
      console.log('Not calling API - invalid progression')
      // Still award regular points but don't increment progress
      setFishCount(prev => prev + 1)
      setHasAttempted(true)
    }
  }

  useEffect(() => {
    // Load user data and check progression validity
    const fetchUserData = async () => {
      try {
        // Get user ID
        let fetchedUserId = getCookie('client-user-id') || 
                           (typeof localStorage !== 'undefined' ? localStorage.getItem('client-user-id') : null) || 
                           (typeof localStorage !== 'undefined' ? localStorage.getItem('supabase-user-id') : null)
        
        if (!fetchedUserId) {
          console.error('User not authenticated')
          return
        }

        setUserId(fetchedUserId)

        // Check if this is a valid progression
        const currentTheoryId = parseInt(params.id as string)
        const isValid = await checkValidProgression(currentTheoryId, fetchedUserId)
        setIsValidProgression(isValid)

        // Fetch user data from users table
        const { data: userData, error } = await supabase
          .from('users')
          .select('current_streak, total_points')
          .eq('id', fetchedUserId)
          .single()

        if (error) {
          console.error('Failed to fetch user data:', error)
          return
        }

        if (userData) {
          // Parse streak data properly
          if (userData.current_streak) {
            const parsedStreak = parseStreakData(userData.current_streak)
            setStreakData(parsedStreak)
            console.log('Parsed streak data:', parsedStreak)
          }
          
          setFishCount(userData.total_points || 0)
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
      }
    }

    if (params.id) {
      fetchUserData()
    }
  }, [params.id])

  useEffect(() => {
    const fetchTheoryData = async () => {
      try {
        const { data, error } = await supabase
          .from('python_lang_theory')
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

  const handleNext = async () => {
    if (!canProceed) return
    
    // Update streak data when proceeding if user is valid
    if (userId && isValidProgression) {
      const today = new Date().toISOString().split('T')[0]
      const [lastUpdateDate, currentCount] = streakData
      
      let newStreakData: [string, number]
      
      // Calculate new streak based on last update date
      if (lastUpdateDate === today) {
        // Already updated today, don't change anything
        newStreakData = streakData
      } else {
        // Get yesterday's date
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayStr = yesterday.toISOString().split('T')[0]
        
        if (lastUpdateDate === yesterdayStr) {
          // Last update was yesterday, increment streak
          newStreakData = [today, currentCount + 1]
        } else if (lastUpdateDate < yesterdayStr) {
          // Last update was before yesterday, reset streak to 1
          newStreakData = [today, 1]
        } else {
          // This shouldn't happen (future date), but handle gracefully
          newStreakData = [today, 1]
        }
        
        // Update streak in database and local state
        const updateSuccess = await updateStreakInDatabase(userId, newStreakData)
        if (updateSuccess) {
          setStreakData(newStreakData)
        }
      }
    }
    
    // Navigate to next theory page (current ID + 1)
    const currentId = parseInt(params.id as string)
    const nextId = currentId + 1
    router.push(`/languages/python/${nextId}`)
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
          <div className="text-6xl mb-6 animate-bounce">😺</div>
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
      {/* Snake Animation */}
      <SnakeAnimation show={showSnakeAnimation} />
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">        
        {/* Main Header Content */}
        <div className="py-6">
          <div className="max-w-7xl mx-auto flex justify-between items-center px-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl animate-pulse">🐾</span>
              <h1 className="text-2xl font-light"><a href='/home'>9lives</a></h1>
            </div>
            
            <div className="flex items-center gap-6">
              <SmartStreakDisplay streakData={streakData} />
              <div className="text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Fish</p>
                <p className="text-xl text-black font-normal">{fishCount} 🐟</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400 uppercase tracking-wider">Mode</p>
                <p className="text-sm font-light text-green-600">Theory</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Timer Progress Bar - now below header */}
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
            Master Python fundamentals, one slither at a time
          </p>
          <p className="text-base text-gray-400 font-light">
            Code is ssss-imple with Python 🐍
          </p>
          
          {/* Progress Status Indicator */}
          {!isValidProgression && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 text-yellow-800">
              <div className="flex items-center justify-center gap-2">
                <span>⚠️</span>
                <span className="font-medium">Review Mode</span>
              </div>
              <p className="text-sm mt-2">
                This theory is not the next in your learning sequence. Progress tracking is limited.
              </p>
            </div>
          )}
          
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
              <span>🐍 {sectionStats.withCode} with code</span>
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
          <div className="animate-pulse text-3xl mb-4">🐍‍💻</div>
          <p className="text-lg text-gray-600 font-light mb-6">
            {canProceed ? 'Ready for the next Python concept?' : 'Keep reading to unlock the next section!'}
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
                  ? 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 hover:shadow-lg'
                  : 'bg-gray-400 text-gray-600 cursor-not-allowed'
              }`}
            >
              {canProceed ? 'Next: Continue Learning →' : `Wait ${formatTime(timeLeft)} to continue`}
            </button>
          </div>
          {canProceed && (
            <div className="mt-4">
              <p className="text-sm text-blue-600 font-light">
                🎉 Great job! You've completed this theory section.
              </p>
              {isValidProgression && (
                <p className="text-sm text-green-600 font-light mt-1">
                  ✅ Progress updated - you're advancing through the curriculum!
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
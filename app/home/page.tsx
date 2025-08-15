'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { inspirationalQuotes } from './quotes'

interface UserProfile {
  id: string
  email: string
  coding_questions_attempted: number
  technical_questions_attempted: number
  fundamental_questions_attempted: number
  aptitude_questions_attempted: number
  java_lang_covered: number
  python_lang_covered: number
  sql_lang_covered: number
  hr_questions_attempted: number
  artificial_intelligence_questions_attempted: number
  blueprint_questions_attempted: number
  tech_topics_covered: number
  current_streak: [string, number] // [date, days] format
  total_points: number
  created_at: string
  updated_at: string
}

interface ProgressCardProps {
  title: string
  emoji: string
  current: number
  total: number
  subtitle: string
  onClick: () => void
}

interface StreakDisplayProps {
  streakData: [string, number]
}

// Helper function to read cookies
const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null
  
  const cookies = document.cookie.split(';')
  const cookie = cookies.find(cookie => cookie.trim().startsWith(`${name}=`))
  return cookie ? decodeURIComponent(cookie.split('=')[1]) : null
}

// Helper function to extract name from email
const getNameFromEmail = (email: string): string => {
  // Special case for durvadongre@gmail.com
  if (email === 'durvadongre@gmail.com') {
    return 'cutu putu'
  }
  
  // Extract name before @ and remove common domain endings
  const namepart = email.split('@')[0]
  
  // Capitalize first letter of each word (in case of dots or underscores)
  const formattedName = namepart
    .split(/[._-]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
  
  return formattedName
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
}

const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

function StreakDisplay({ streakData }: StreakDisplayProps) {
  const [streakDate, streakDays] = streakData
  const today = new Date().toISOString().split('T')[0]
  
  let displayDays = streakDays
  let textColor = 'text-gray-400'
  let emojiStyle = 'opacity-50 grayscale'
  
  // Only show active colors if streak date is today
  if (streakDate === today) {
    textColor = 'text-orange-500'
    emojiStyle = 'opacity-100'
  } else {
    // For any date that's not today (including yesterday), show gray
    displayDays = 0
    textColor = 'text-gray-400'
    emojiStyle = 'opacity-50 grayscale'
  }
  
  return (
    <div className="text-center">
      <p className="text-xs text-gray-400 uppercase tracking-wider">Streak</p>
      <p className={`text-lg font-light ${textColor}`}>
        {displayDays} <span className={`${emojiStyle}`}>🔥</span>
      </p>
    </div>
  )
}

function ProgressCard({ title, emoji, current, total, subtitle, onClick }: ProgressCardProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0
  return (
    <div 
      onClick={onClick}
      className="group bg-white border border-gray-100 hover:border-black cursor-pointer transition-all duration-500 ease-out hover:shadow-lg"
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <span className="text-3xl group-hover:animate-bounce transition-all duration-300">{emoji}</span>
          <span className="font-mono text-2xl font-light group-hover:scale-110 transition-transform duration-300">{current}</span>
        </div>
        
        <h3 className="font-mono font-medium text-lg mb-1 group-hover:text-black transition-colors">{title}</h3>
        <p className="font-mono text-xs text-gray-500 mb-4">{subtitle}</p>
        
        <div className="w-full">
          <div className="flex justify-between items-center mb-2">
            <span className="font-mono text-xs text-gray-400">Progress</span>
            <span className="font-mono text-xs text-gray-600">{current}/{total}</span>
          </div>
          <div className="w-full bg-gray-50 h-1 rounded-full overflow-hidden">
            <div 
              className="bg-black h-full transition-all duration-700 ease-out rounded-full"
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
 
export default function HomePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [catAnimation, setCatAnimation] = useState('😺')
  const [currentQuote, setCurrentQuote] = useState('')
  const router = useRouter()

  // Cat animation cycle
  useEffect(() => {
    const cats = ['😺', '😸', '😻', '🐱', '😽']
    let index = 0
    
    const interval = setInterval(() => {
      index = (index + 1) % cats.length
      setCatAnimation(cats[index])
    }, 3000)
    
    return () => clearInterval(interval)
  }, [])

  // Random quote selection
  useEffect(() => {
    const randomQuote = inspirationalQuotes[Math.floor(Math.random() * inspirationalQuotes.length)]
    setCurrentQuote(randomQuote)
  }, [])

  useEffect(() => {
    loadUserProfile()
  }, [])

  const loadUserProfile = async () => {
    try {
      // Check if Supabase is properly initialized
      if (!supabase) {
        setError('Database connection not available')
        setLoading(false)
        return
      }

      // Get user ID from client-accessible cookie or localStorage
      let userId = getCookie('client-user-id') || localStorage.getItem('client-user-id') || localStorage.getItem('supabase-user-id')
      
      if (!userId) {
        setError('User not authenticated')
        setLoading(false)
        return
      }

      console.log('Fetching user profile for ID:', userId)

      // Fetch user data directly from Supabase
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select(`
          id,
          email,
          coding_questions_attempted,
          technical_questions_attempted,
          fundamental_questions_attempted,
          aptitude_questions_attempted,
          java_lang_covered,
          python_lang_covered,
          sql_lang_covered,
          hr_questions_attempted,
          artificial_intelligence_questions_attempted,
          blueprint_questions_attempted,
          tech_topics_covered,
          current_streak,
          total_points,
          created_at,
          updated_at
        `)
        .eq('id', userId)
        .single()

      if (profileError || !userProfile) {
        console.error('Failed to fetch user profile:', profileError)
        if (profileError?.code === 'PGRST116') {
          setError('User profile not found')
        } else {
          setError('Failed to load user profile: ' + (profileError?.message || 'Unknown error'))
        }
        setLoading(false)
        return
      }

      console.log('User profile loaded successfully:', userProfile)
      setProfile(userProfile)
      setLoading(false)
    } catch (err) {
      console.error('Profile load error:', err)
      setError('Failed to load profile: ' + (err instanceof Error ? err.message : 'Unknown error'))
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      // Call logout API
      await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include'
      })
    } catch (err) {
      console.error('Logout API error:', err)
    }
    
    // Clear local storage
    localStorage.clear()
    sessionStorage.clear()
    
    // Redirect to login
    router.push('/login')
  }

  const calculateTotalQuestions = (profile: UserProfile) => {
    return profile.coding_questions_attempted +
           Math.floor(profile.technical_questions_attempted / 50) +
           Math.floor(profile.fundamental_questions_attempted / 50) +
           Math.floor(profile.aptitude_questions_attempted / 50) +
           profile.hr_questions_attempted +
           profile.artificial_intelligence_questions_attempted +
           profile.blueprint_questions_attempted
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6 animate-pulse">🐱</div>
          <p className="font-mono text-gray-600">Loading your purr-fect progress...</p>
          <div className="mt-6 w-32 h-0.5 bg-gray-100 mx-auto overflow-hidden">
            <div className="h-full bg-black animate-pulse"></div>
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
              onClick={() => router.push('/login')}
              className="w-full py-4 bg-black text-white font-mono hover:bg-gray-800 transition-all duration-300"
            >
              Go to Login
            </button>
            <button 
              onClick={loadUserProfile}
              className="w-full py-4 border border-gray-200 font-mono hover:border-black hover:bg-gray-50 transition-all duration-300"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6">😾</div>
          <p className="font-mono text-gray-600 mb-6">No profile data available.</p>
          <button 
            onClick={loadUserProfile}
            className="py-3 px-6 bg-black text-white font-mono hover:bg-gray-800 transition-colors"
          >
            Reload Profile
          </button>
        </div>
      </div>
    )
  }

  const totalQuestions = calculateTotalQuestions(profile)
  const totalLanguagesCovered = profile.java_lang_covered + profile.python_lang_covered + profile.sql_lang_covered
  const displayName = getNameFromEmail(profile.email)

  return (
    <div className="min-h-screen bg-white text-black font-mono">
      {/* Header */}
      <header className="border-b border-gray-100 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-6">
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-pulse">🐾</span>
            <h1 className="text-2xl font-light">9lives</h1>
          </div>
          
          <div className="flex items-center gap-8">
            <StreakDisplay streakData={profile.current_streak} />
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Fish</p>
              <p className="text-lg font-light">{profile.total_points} 🐟</p>
            </div>
            <button 
              onClick={() => router.push('/leaderboard')}
              className="text-center hover:scale-105 transition-transform duration-300 cursor-pointer"
            >
              <p className="text-xs text-gray-400 uppercase tracking-wider">Leaderboard</p>
              <p className="text-lg font-light">📈</p>
            </button>
            <div className="text-center hidden md:block">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Welcome</p>
              <p className="text-sm font-light">{profile.email}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="py-2 px-4 border border-gray-200 hover:border-black hover:bg-gray-50 transition-all duration-300 font-light text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="text-center py-8">
          <div className="text-6xl mb-4 transition-all duration-500">{catAnimation}</div>
          <h2 className="text-3xl font-light mb-3">
            Welcome back, {displayName}!
          </h2>
          <p className="text-lg text-gray-600 font-light mb-1">
            Ready to pounce on some new challenges?
          </p>
          <p className="text-sm text-gray-400 font-light">
            {totalQuestions} questions conquered • {9 - (profile.current_streak[1] % 9)} lives remaining
          </p>
        </div>

        {/* Progress Cards Grid - All 9 Categories in Specified Order */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 px-6">
          <ProgressCard
            title="Coding Challenges"
            emoji="💻"
            current={profile.coding_questions_attempted}
            total={200}
            subtitle="Claw your way through algorithms"
            onClick={() => router.push('/coding')}
          />
          
          <ProgressCard
            title="Aptitude Tests"
            emoji="🧮"
            current={Math.floor(profile.aptitude_questions_attempted / 50)}
            total={50}
            subtitle="Sharp as a cat's claw logic"
            onClick={() => router.push('/aptitude')}
          />

          <ProgressCard
            title="Languages Covered"
            emoji="🌐"
            current={totalLanguagesCovered}
            total={150}
            subtitle="Java, Python & SQL mastery meow-nificent"
            onClick={() => router.push('/languages')}
          />
          
          <ProgressCard
            title="Technical Questions"
            emoji="⚙️"
            current={Math.floor(profile.technical_questions_attempted / 50)}
            total={50}
            subtitle="Technical prowess that's paw-some"
            onClick={() => router.push('/technical')}
          />

          <ProgressCard
            title="HR Questions"
            emoji="👥"
            current={profile.hr_questions_attempted}
            total={50}
            subtitle="People skills with purr-sonality"
            onClick={() => router.push('/hr')}
          />
          
          <ProgressCard
            title="Fundamental Questions"
            emoji="📚"
            current={Math.floor(profile.fundamental_questions_attempted / 50)}
            total={50}
            subtitle="Master the cat-egories of knowledge"
            onClick={() => router.push('/fundamentals')}
          />

          <ProgressCard
            title="AI Roadmaps"
            emoji="🤖"
            current={profile.artificial_intelligence_questions_attempted}
            total={50}
            subtitle="Artificial intelligence roadmaps, real results"
            onClick={() => router.push('/ai-roadmaps')}
          />

          <ProgressCard
            title="Blueprint Roadmaps"
            emoji="📐"
            current={profile.blueprint_questions_attempted}
            total={50}
            subtitle="Architectural roadmaps that's claw-some"
            onClick={() => router.push('/blueprint-roadmaps')}
          />

          <ProgressCard
            title="Tech Topics Mastered"
            emoji="🧠"
            current={profile.tech_topics_covered}
            total={50}
            subtitle="Curiosity didn't kill this cat"
            onClick={() => router.push('/topics')}
          />
        </div>

        {/* Stats Overview */}
        <div className="px-6 mb-8">
          <div className="bg-gray-50 py-8">
            <h3 className="text-xl font-light text-center mb-8">Your Paw-some Progress</h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center max-w-4xl mx-auto">
              <div className="group">
                <div className="text-3xl font-light mb-1 group-hover:scale-110 transition-transform duration-300">{totalQuestions}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Total Questions</div>
              </div>
              <div className="group">
                <div className="text-3xl font-light mb-1 group-hover:scale-110 transition-transform duration-300">{profile.tech_topics_covered}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Topics Mastered</div>
              </div>
              <div className="group">
                <div className="text-3xl font-light mb-1 group-hover:scale-110 transition-transform duration-300">{profile.current_streak[1]}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Day Streak</div>
              </div>
              <div className="group">
                <div className="text-3xl font-light mb-1 group-hover:scale-110 transition-transform duration-300">{profile.total_points}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Total Fish</div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Motivational */}
        <div className="text-center py-8 border-t border-gray-100 px-6">
          <div className="animate-pulse text-lg mb-3">🐱‍💻</div>
          <p className="text-base text-gray-600 font-light italic mb-2">
            "{currentQuote}"
          </p>
          <p className="text-sm text-gray-400 font-light">
            Next milestone: {Math.ceil((totalQuestions + 1) / 10) * 10} questions
          </p>
        </div>
      </main>
    </div>
  )
}
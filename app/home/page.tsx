'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { inspirationalQuotes } from './quotes'

interface UserProfile {
  id: string
  email: string
  coding_questions_attempted: number
  technical_questions_attempted: number
  fundamental_questions_attempted: number
  aptitude_questions_attempted?: number
  tech_topics_covered: number
  current_streak: [string, number] // [date, days] format
  total_fish: number
  total_points: number // Added total_points field
  total_questions_attempted: number
  categories: {
    coding: number
    technical: number
    fundamental: number
    aptitude: number
  }
  progress: {
    tech_topics_covered: number
    current_streak: [string, number]
    total_fish: number
    total_points: number // Added total_points to progress
  }
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
  const [isAuthenticated, setIsAuthenticated] = useState(false)
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
    checkAuthAndFetchProfile()
  }, [])

  const checkAuthAndFetchProfile = async () => {
    try {
      console.log('Checking authentication and fetching profile...')
      
      // First, try cookie-based authentication (our new primary method)
      const response = await fetch('/api/auth/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Essential for cookie-based auth
      })

      console.log('Profile API response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('Profile data received:', data)
        
        if (data.profile) {
          setProfile(data.profile)
          setIsAuthenticated(true)
        } else {
          throw new Error('No profile data received')
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Profile API Error:', errorData)
        
        if (response.status === 401) {
          console.log('Not authenticated, user needs to login')
          setIsAuthenticated(false)
          setError('Please log in to continue')
        } else if (response.status === 404) {
          console.log('User profile not found in database')
          setError('User profile not found. Please contact support.')
        } else {
          throw new Error(errorData.error || errorData.details || `HTTP ${response.status}`)
        }
      }
      
    } catch (err) {
      console.error('Profile fetch error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load profile')
      setIsAuthenticated(false)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      console.log('Logging out...')
      
      const response = await fetch('/api/auth/logout', { 
        method: 'POST',
        credentials: 'include' // Important for cookie-based auth
      })
      
      if (response.ok) {
        console.log('Logout successful')
      } else {
        console.warn('Logout request failed, but proceeding with client cleanup')
      }
      
      // Clear any client-side storage (just in case)
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
      }
      
      // Redirect to login
      router.push('/login')
      
    } catch (err) {
      console.error('Logout error:', err)
      // Even if logout fails, clear storage and redirect
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
      }
      router.push('/login')
    }
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

  if (error || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6 animate-bounce">😿</div>
          <p className="font-mono text-red-400 mb-8">
            {error || "Authentication required"}
          </p>
          <div className="space-y-4">
            <button 
              onClick={() => router.push('/login')}
              className="w-full py-4 bg-black text-white font-mono hover:bg-gray-800 transition-all duration-300"
            >
              Go to Login
            </button>
            <button 
              onClick={checkAuthAndFetchProfile}
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
            onClick={checkAuthAndFetchProfile}
            className="py-3 px-6 bg-black text-white font-mono hover:bg-gray-800 transition-colors"
          >
            Reload Profile
          </button>
        </div>
      </div>
    )
  }

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
            <StreakDisplay streakData={profile.progress.current_streak} />
            <div className="text-center">
              <p className="text-xs text-gray-400 uppercase tracking-wider">Fish</p>
              <p className="text-lg font-light">{profile.total_points || profile.progress.total_points || 0} 🐟</p>
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
            Welcome back, cutu putu!
          </h2>
          <p className="text-lg text-gray-600 font-light mb-1">
            Ready to pounce on some new challenges?
          </p>
          <p className="text-sm text-gray-400 font-light">
            {profile.total_questions_attempted} questions conquered • {9 - (profile.progress.current_streak[1] % 9)} lives remaining
          </p>
        </div>

        {/* Progress Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mb-8 px-6">
          <ProgressCard
            title="Coding Challenges"
            emoji="💻"
            current={profile.categories.coding}
            total={200}
            subtitle="Claw your way through algorithms"
            onClick={() => router.push('/coding')}
          />
          
          <ProgressCard
            title="Technical Questions"
            emoji="⚙️"
            current={profile.categories.technical}
            total={50}
            subtitle="Technical prowess that's paw-some"
            onClick={() => router.push('/technical')}
          />
          
          <ProgressCard
            title="Fundamental Questions"
            emoji="📚"
            current={profile.categories.fundamental}
            total={50}
            subtitle="Master the cat-egories of knowledge"
            onClick={() => router.push('/fundamentals')}
          />
          
          <ProgressCard
            title="Aptitude Tests"
            emoji="🧮"
            current={profile.categories.aptitude}
            total={50}
            subtitle="Sharp as a cat's claw logic"
            onClick={() => router.push('/aptitude')}
          />
        </div>

        {/* Tech Topics Card */}
        <div className="px-6 mb-8">
          <ProgressCard
            title="Tech Topics Mastered"
            emoji="🧠"
            current={profile.progress.tech_topics_covered}
            total={25}
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
                <div className="text-3xl font-light mb-1 group-hover:scale-110 transition-transform duration-300">{profile.total_questions_attempted}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Total Questions</div>
              </div>
              <div className="group">
                <div className="text-3xl font-light mb-1 group-hover:scale-110 transition-transform duration-300">{profile.progress.tech_topics_covered}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Topics Mastered</div>
              </div>
              <div className="group">
                <div className="text-3xl font-light mb-1 group-hover:scale-110 transition-transform duration-300">{profile.progress.current_streak[1]}</div>
                <div className="text-xs text-gray-500 uppercase tracking-wider">Day Streak</div>
              </div>
              <div className="group">
                <div className="text-3xl font-light mb-1 group-hover:scale-110 transition-transform duration-300">{profile.total_points || profile.progress.total_points || 0}</div>
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
            Next milestone: {Math.ceil((profile.total_questions_attempted + 1) / 10) * 10} questions
          </p>
        </div>
      </main>
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with proper type checking
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

interface LeaderboardUser {
  id: string
  email: string
  rank: number
  total_points: number
  current_streak: number
  tech_topics_covered: number
  total_questions_attempted: number
  categories: {
    coding: number
    technical: number
    fundamental: number
    aptitude: number
    hr: number
  }
  language_coverage: {
    java: number
    python: number
    sql: number
  }
  special_topics: {
    ai: number
    system_design: number
  }
  today_activity: {
    coding: number
    technical: number
    fundamental: number
    aptitude: number
    hr: number
    tech_topics: number
    ai: number
    system_design: number
    java: number
    python: number
    sql: number
  }
}

interface LeaderboardStats {
  total_users: number
  top_score: number
  active_today: number
  total_today_activity: number
}

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([])
  const [stats, setStats] = useState<LeaderboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [catAnimation, setCatAnimation] = useState('🏆')
  const [viewMode, setViewMode] = useState<'overall' | 'today'>('overall')

  // Cat animation cycle
  useEffect(() => {
    const cats = ['🐟', '🐱', '😸', '😻', '🐾', '😺', '😽', '🙀']
    let index = 0
    
    const interval = setInterval(() => {
      index = (index + 1) % cats.length
      setCatAnimation(cats[index])
    }, 2000)
    
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch users data
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select(`
          id,
          email,
          total_points,
          current_streak,
          tech_topics_covered,
          coding_questions_attempted,
          technical_questions_attempted,
          fundamental_questions_attempted,
          aptitude_questions_attempted,
          hr_questions_attempted,
          artificial_intelligence_topics_covered,
          system_design_covered,
          java_lang_covered,
          python_lang_covered,
          sql_lang_covered,
          created_at
        `)
        .order('total_points', { ascending: false })

      if (usersError) throw usersError

      // Fetch today's activity data
      const { data: todayData, error: todayError } = await supabase
        .from('today')
        .select(`
          uid,
          coding_questions_attempted,
          technical_questions_attempted,
          fundamental_questions_attempted,
          aptitude_questions_attempted,
          hr_questions_attempted,
          tech_topics_covered,
          artificial_intelligence_topics_covered,
          system_design_covered,
          java_lang_covered,
          python_lang_covered,
          sql_lang_covered
        `)

      if (todayError) throw todayError

      // Create a map of today's data for easy lookup
      const todayMap = new Map()
      todayData?.forEach(today => {
        todayMap.set(today.uid, today)
      })

      // Process and combine data (filter out testkitty@9lives.com)
      const processedUsers: LeaderboardUser[] = usersData?.filter(user => 
        user.email !== 'testkitty@9lives.com'
      ).map((user, index) => {
        const todayActivity = todayMap.get(user.id) || {}
        
        // Parse current_streak (it's stored as jsonb [date, streak_count])
        let streakValue = 0
        if (user.current_streak && Array.isArray(user.current_streak)) {
          streakValue = user.current_streak[1] || 0
        }

        return {
          id: user.id,
          email: user.email,
          rank: index + 1,
          total_points: user.total_points || 0,
          current_streak: streakValue,
          tech_topics_covered: user.tech_topics_covered || 0,
          total_questions_attempted: 
            (user.coding_questions_attempted || 0) +
            (user.technical_questions_attempted || 0) +
            (user.fundamental_questions_attempted || 0) +
            (user.aptitude_questions_attempted || 0) +
            (user.hr_questions_attempted || 0),
          categories: {
            coding: user.coding_questions_attempted || 0,
            technical: user.technical_questions_attempted || 0,
            fundamental: user.fundamental_questions_attempted || 0,
            aptitude: user.aptitude_questions_attempted || 0,
            hr: user.hr_questions_attempted || 0,
          },
          language_coverage: {
            java: user.java_lang_covered || 0,
            python: user.python_lang_covered || 0,
            sql: user.sql_lang_covered || 0,
          },
          special_topics: {
            ai: user.artificial_intelligence_topics_covered || 0,
            system_design: user.system_design_covered || 0,
          },
          today_activity: {
            coding: todayActivity.coding_questions_attempted || 0,
            technical: todayActivity.technical_questions_attempted || 0,
            fundamental: todayActivity.fundamental_questions_attempted || 0,
            aptitude: todayActivity.aptitude_questions_attempted || 0,
            hr: todayActivity.hr_questions_attempted || 0,
            tech_topics: todayActivity.tech_topics_covered || 0,
            ai: todayActivity.artificial_intelligence_topics_covered || 0,
            system_design: todayActivity.system_design_covered || 0,
            java: todayActivity.java_lang_covered || 0,
            python: todayActivity.python_lang_covered || 0,
            sql: todayActivity.sql_lang_covered || 0,
          }
        }
      }) || []

      // Calculate stats
      const totalTodayActivity = todayData?.reduce((sum, today) => {
        return sum + 
          (today.coding_questions_attempted || 0) +
          (today.technical_questions_attempted || 0) +
          (today.fundamental_questions_attempted || 0) +
          (today.aptitude_questions_attempted || 0) +
          (today.hr_questions_attempted || 0)
      }, 0) || 0

      const statsData: LeaderboardStats = {
        total_users: usersData?.length || 0,
        top_score: usersData?.[0]?.total_points || 0,
        active_today: todayData?.length || 0,
        total_today_activity: totalTodayActivity
      }

      setLeaderboard(processedUsers)
      setStats(statsData)
    } catch (err) {
      console.error('Error fetching leaderboard:', err)
      setError(err instanceof Error ? err.message : 'An error occurred while fetching data')
    } finally {
      setLoading(false)
    }
  }

  const getCatByRank = (rank: number) => {
    if (rank === 1) return '👑'  // Crown for the king
    if (rank === 2) return '🥈'  // Silver medal
    if (rank === 3) return '🥉'  // Bronze medal
    if (rank <= 5) return '🐱'   // Top 5
    if (rank <= 10) return '😸'  // Top 10
    if (rank <= 20) return '😻'  // Top 20
    return '🐾'                   // Everyone else
  }

  const getCatMood = (rank: number) => {
    if (rank === 1) return '😎'   // Cool cat
    if (rank <= 3) return '😸'    // Happy
    if (rank <= 10) return '😺'   // Content
    if (rank <= 50) return '🙂'   // Okay
    return '😿'                    // Sad
  }

  const formatEmail = (email: string) => {
    if (email.length > 20) {
      return email.substring(0, 17) + '...'
    }
    return email
  }

  const getRankSuffix = (rank: number) => {
    if (rank % 100 >= 11 && rank % 100 <= 13) return 'th'
    switch (rank % 10) {
      case 1: return 'st'
      case 2: return 'nd'
      case 3: return 'rd'
      default: return 'th'
    }
  }

  const getTodayActivityTotal = (user: LeaderboardUser) => {
    return user.today_activity.coding + 
           user.today_activity.technical + 
           user.today_activity.fundamental + 
           user.today_activity.aptitude + 
           user.today_activity.hr
  }

  const sortedByTodayActivity = [...leaderboard].sort((a, b) => 
    getTodayActivityTotal(b) - getTodayActivityTotal(a)
  ).map((user, index) => ({ ...user, rank: index + 1 }))

  const displayData = viewMode === 'today' ? sortedByTodayActivity : leaderboard

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 text-black font-mono flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-8xl mb-8 animate-bounce">{catAnimation}</div>
          <p className="text-xl text-gray-600 font-light mb-4">Summoning cats from across the realm...</p>
          <div className="mt-8 w-48 h-1 bg-gray-200 mx-auto overflow-hidden">
            <div className="h-full bg-black animate-pulse"></div>
          </div>
          <p className="text-sm text-gray-400 mt-4 font-light italic">Meow meow meow...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 text-black font-mono flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="text-8xl mb-8 animate-bounce">😿</div>
          <p className="text-xl text-gray-600 mb-4 font-light">The cats have scattered!</p>
          <p className="text-gray-500 mb-8 font-light">{error}</p>
          <button 
            onClick={fetchLeaderboard}
            className="w-full py-4 px-6 bg-black text-white font-light hover:bg-gray-800 transition-all duration-300"
          >
            🐾 Gather the Cats Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-black font-mono">
      {/* Header */}
      <header className="border-b border-gray-100 py-4 px-6">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-pulse">{catAnimation}</span>
            <h1 className="text-2xl font-light">9lives</h1>
          </div>
          
          <div className="flex items-center gap-8">
            {stats && (
              <>
                <div className="text-center">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Total Cats</p>
                  <p className="text-lg font-light">{stats.total_users}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Top Fishes</p>
                  <p className="text-lg font-light">{stats.top_score.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Active Today</p>
                  <p className="text-lg font-light">{stats.active_today}</p>
                </div>
              </>
            )}
            <button 
              onClick={() => window.history.back()}
              className="py-2 px-4 border border-gray-200 hover:border-black hover:bg-gray-50 transition-all duration-300 font-light text-sm"
            >
              Back
            </button>
          </div>
        </div>
      </header>

      {/* View Toggle */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex gap-2 bg-white p-1 border border-gray-200 w-fit">
          <button
            onClick={() => setViewMode('overall')}
            className={`px-6 py-2 font-light transition-all ${
              viewMode === 'overall'
                ? 'bg-black text-white'
                : 'text-gray-600 hover:text-black hover:bg-gray-50'
            }`}
          >
            🏆 Overall Rankings
          </button>
          <button
            onClick={() => setViewMode('today')}
            className={`px-6 py-2 font-light transition-all ${
              viewMode === 'today'
                ? 'bg-black text-white'
                : 'text-gray-600 hover:text-black hover:bg-gray-50'
            }`}
          >
            📅 Today's Activity
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 pb-12">
        {/* Leaderboard */}
        <div className="mb-12">
          {displayData.length === 0 ? (
            <div className="text-center py-20 bg-white shadow-sm border border-gray-200">
              <div className="text-8xl mb-8">😴</div>
              <p className="text-2xl text-gray-600 font-light mb-4">The kingdom sleeps...</p>
              <p className="text-gray-500 font-light">No brave cats have ventured forth yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayData.map((user, index) => (
                <div
                  key={user.id}
                  className={`group bg-white hover:bg-gray-50 border-2 transition-all duration-500 ease-out hover:shadow-xl hover:scale-[1.02] ${
                    user.rank === 1 ? 'border-yellow-400 bg-gradient-to-r from-yellow-50 to-white' :
                    user.rank === 2 ? 'border-gray-300 bg-gradient-to-r from-gray-50 to-white' :
                    user.rank === 3 ? 'border-orange-300 bg-gradient-to-r from-orange-50 to-white' :
                    'border-gray-200 hover:border-black'
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getCatByRank(user.rank)}</span>
                          <span className="text-2xl">{getCatMood(user.rank)}</span>
                        </div>
                        
                        <div className="text-center">
                          <div className={`font-light text-2xl ${user.rank <= 3 ? 'text-black' : 'text-gray-700'}`}>
                            #{user.rank}<span className="text-sm">{getRankSuffix(user.rank)}</span>
                          </div>
                          <div className="text-xs text-gray-400 uppercase tracking-wider">Place</div>
                        </div>
                        
                        <div className="ml-4">
                          <div className="font-light text-lg mb-1">{formatEmail(user.email)}</div>
                          <div className="text-xs text-gray-500 font-light flex flex-wrap gap-2">
                            {viewMode === 'overall' ? (
                              <>
                                <span>🎯 {user.categories.coding}c</span>
                                <span>⚙️ {user.categories.technical}t</span>
                                <span>📚 {user.categories.fundamental}f</span>
                                <span>🧠 {user.categories.aptitude}a</span>
                                <span>👥 {user.categories.hr}hr</span>
                                <span>📊 {user.total_questions_attempted}q</span>
                                <span>🏷️ {user.tech_topics_covered} topics</span>
                                {user.language_coverage.java > 0 && <span>☕ {user.language_coverage.java}j</span>}
                                {user.language_coverage.python > 0 && <span>🐍 {user.language_coverage.python}py</span>}
                                {user.language_coverage.sql > 0 && <span>🗄️ {user.language_coverage.sql}sql</span>}
                                {user.special_topics.ai > 0 && <span>🤖 {user.special_topics.ai}ai</span>}
                                {user.special_topics.system_design > 0 && <span>🏗️ {user.special_topics.system_design}sd</span>}
                                {user.current_streak > 0 && (
                                  <span className="text-orange-600">🔥 {user.current_streak}d streak</span>
                                )}
                              </>
                            ) : (
                              <>
                                <span>🎯 {user.today_activity.coding}c</span>
                                <span>⚙️ {user.today_activity.technical}t</span>
                                <span>📚 {user.today_activity.fundamental}f</span>
                                <span>🧠 {user.today_activity.aptitude}a</span>
                                <span>👥 {user.today_activity.hr}hr</span>
                                <span>📊 {getTodayActivityTotal(user)}q today</span>
                                <span>🏷️ {user.today_activity.tech_topics} topics</span>
                                {user.today_activity.java > 0 && <span>☕ {user.today_activity.java}j</span>}
                                {user.today_activity.python > 0 && <span>🐍 {user.today_activity.python}py</span>}
                                {user.today_activity.sql > 0 && <span>🗄️ {user.today_activity.sql}sql</span>}
                                {user.today_activity.ai > 0 && <span>🤖 {user.today_activity.ai}ai</span>}
                                {user.today_activity.system_design > 0 && <span>🏗️ {user.today_activity.system_design}sd</span>}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className={`text-3xl font-light flex items-center gap-2 ${
                          user.rank === 1 ? 'text-yellow-600' :
                          user.rank === 2 ? 'text-gray-600' :
                          user.rank === 3 ? 'text-orange-600' :
                          'text-black'
                        }`}>
                          {viewMode === 'overall' ? (
                            <>
                              {user.total_points.toLocaleString()} <span className="text-2xl">🐟</span>
                            </>
                          ) : (
                            <>
                              {getTodayActivityTotal(user)} <span className="text-2xl">⚡</span>
                            </>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 uppercase tracking-wider">
                          {viewMode === 'overall' ? 'Fishes' : 'Today'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center py-8 border-t border-gray-100">
          <div className="animate-pulse text-lg mb-3">🐱‍💻</div>
          <p className="text-base text-gray-600 font-light italic mb-2">
            "Every expert was once a beginner. Every pro was once an amateur."
          </p>
          <p className="text-sm text-gray-400 font-light">
            Keep coding, keep climbing! 🚀
          </p>
        </div>
      </main>
    </div>
  )
}

export default Leaderboard
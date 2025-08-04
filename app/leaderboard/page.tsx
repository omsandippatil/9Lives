'use client'

import { useState, useEffect } from 'react'

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
  }
}

interface LeaderboardStats {
  total_users: number
  users_returned: number
  top_score: number
  has_more: boolean
}

const Leaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([])
  const [stats, setStats] = useState<LeaderboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [catAnimation, setCatAnimation] = useState('🏆')

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
      const response = await fetch('/api/get/leaderboard')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch leaderboard')
      }

      setLeaderboard(data.leaderboard)
      setStats(data.stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 text-black font-mono flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-8xl mb-8 animate-bounce">{catAnimation}</div>
          <p className="text-xl text-gray-600 font-light mb-4">Summoning cats from across the realm...</p>
          <div className="mt-8 w-48 h-1 bg-gray-200 mx-auto overflow-hidden rounded-full">
            <div className="h-full bg-black animate-pulse rounded-full"></div>
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
            className="w-full py-4 px-6 bg-black text-white font-light hover:bg-gray-800 transition-all duration-300 rounded-sm"
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

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Leaderboard */}
        <div className="mb-12">
          {leaderboard.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="text-8xl mb-8">😴</div>
              <p className="text-2xl text-gray-600 font-light mb-4">The kingdom sleeps...</p>
              <p className="text-gray-500 font-light">No brave cats have ventured forth yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaderboard.map((user, index) => (
                <div
                  key={user.id}
                  className={`group bg-white hover:bg-gray-50 border-2 transition-all duration-500 ease-out hover:shadow-xl hover:scale-[1.02] rounded-sm ${
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
                          <div className="text-xs text-gray-500 font-light flex flex-wrap gap-3">
                            <span>🎯 {user.categories.coding}c</span>
                            <span>⚙️ {user.categories.technical}t</span>
                            <span>📚 {user.categories.fundamental}f</span>
                            <span>🧠 {user.categories.aptitude}a</span>
                            <span>📊 {user.total_questions_attempted}q</span>
                            <span>🏷️ {user.tech_topics_covered} topics</span>
                            {user.current_streak > 0 && (
                              <span className="text-orange-600">🔥 {user.current_streak}d streak</span>
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
                          {user.total_points.toLocaleString()} <span className="text-2xl">🐟</span>
                        </div>
                        <div className="text-xs text-gray-400 uppercase tracking-wider">Fishes</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Load More */}
          {stats?.has_more && (
            <div className="text-center mt-12">
              <button className="py-4 px-12 bg-black text-white font-light hover:bg-gray-800 transition-all duration-300 rounded-sm text-lg">
                🐾 Summon More Cats
              </button>
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
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
    const cats = ['🏆', '🐱', '😸', '😻', '🐾']
    let index = 0
    
    const interval = setInterval(() => {
      index = (index + 1) % cats.length
      setCatAnimation(cats[index])
    }, 3000)
    
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
    if (rank === 1) return '🐱'
    if (rank === 2) return '😸'
    if (rank === 3) return '😻'
    return '🐾'
  }

  const formatEmail = (email: string) => {
    if (email.length > 25) {
      return email.substring(0, 22) + '...'
    }
    return email
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-black font-mono flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6 animate-pulse">🐱</div>
          <p className="text-gray-600 font-light">Loading leaderboard...</p>
          <div className="mt-6 w-32 h-0.5 bg-gray-100 mx-auto overflow-hidden">
            <div className="h-full bg-black animate-pulse"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white text-black font-mono flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6 animate-bounce">😿</div>
          <p className="text-gray-600 mb-8 font-light">{error}</p>
          <button 
            onClick={fetchLeaderboard}
            className="w-full py-4 bg-black text-white font-light hover:bg-gray-800 transition-all duration-300"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-black font-mono">
      {/* Header */}
      <header className="border-b border-gray-100 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-pulse">🐾</span>
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
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Top Score</p>
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
      <main className="max-w-7xl mx-auto">


        {/* Leaderboard */}
        <div className="mb-8">
          {leaderboard.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-6">😴</div>
              <p className="text-gray-600 font-light">No cats found on the leaderboard yet.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {leaderboard.map((user) => (
                <div
                  key={user.id}
                  className="group bg-white border border-gray-100 hover:border-black cursor-pointer transition-all duration-500 ease-out hover:shadow-lg"
                >
                  <div className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-lg">{getCatByRank(user.rank)}</span>
                        <span className="font-light text-lg min-w-[2.5rem]">#{user.rank}</span>
                        <div className="font-light">{formatEmail(user.email)}</div>
                        <div className="text-xs text-gray-500 font-light">
                          {user.categories.coding}c • {user.categories.technical}t • {user.categories.fundamental}f • {user.categories.aptitude}a • {user.total_questions_attempted}q • {user.tech_topics_covered}topics
                          {user.current_streak > 0 && ` • ${user.current_streak}d streak`}
                        </div>
                      </div>
                      <div className="text-lg font-light">
                        {user.total_points.toLocaleString()} pts
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Load More */}
          {stats?.has_more && (
            <div className="text-center mt-8">
              <button className="py-4 px-8 bg-black text-white font-light hover:bg-gray-800 transition-all duration-300">
                Load More Cats
              </button>
            </div>
          )}
        </div>

        {/* Bottom Motivational */}
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
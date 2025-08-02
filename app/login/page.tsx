'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [catMeow, setCatMeow] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Login failed')
        // Trigger sad cat animation
        setCatMeow(true)
        setTimeout(() => setCatMeow(false), 1000)
      } else {
        // Success! Trigger happy cat animation
        setCatMeow(true)
        setTimeout(() => {
          router.push('/home')
        }, 800)
      }
    } catch (err) {
      setError('Something went wrong. Try again!')
      setCatMeow(true)
      setTimeout(() => setCatMeow(false), 1000)
    } finally {
      setLoading(false)
    }
  }

  const getCatEmoji = () => {
    if (error) return '😿'
    if (loading) return '😴'
    if (catMeow && !error) return '😻'
    return '😸'
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 font-mono">
      <div className="w-full max-w-md">
        {/* Cat Header */}
        <div className="text-center mb-10">
          <div className={`text-7xl mb-4 transition-all duration-500 ${
            catMeow ? 'scale-125 rotate-3' : 'scale-100'
          }`}>
            {getCatEmoji()}
          </div>
          <h1 className="text-4xl font-bold text-black mb-2 tracking-tight">
            9lives
          </h1>
          <p className="text-gray-600 text-sm flex items-center justify-center gap-2">
            <span>🐾</span>
            <span>~ meow into your code ~</span>
            <span>🐾</span>
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-gray-50 border-2 border-black p-8 relative">
          {/* Corner cat decorations */}
          <div className="absolute -top-3 -left-3 text-2xl bg-white border-2 border-black px-2 py-1">
            🐱
          </div>
          <div className="absolute -top-3 -right-3 text-2xl bg-white border-2 border-black px-2 py-1">
            🐱
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-black mb-2 flex items-center gap-2">
                📧 email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border-2 border-black bg-white text-black placeholder-gray-400 focus:outline-none focus:border-gray-600 focus:shadow-lg transition-all font-mono"
                placeholder="cat@9lives.dev"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold text-black mb-2 flex items-center gap-2">
                🔐 password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-black bg-white text-black placeholder-gray-400 focus:outline-none focus:border-gray-600 focus:shadow-lg transition-all font-mono"
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>

            {error && (
              <div className="text-center bg-red-50 border-2 border-red-300 p-3">
                <p className="text-red-700 text-sm font-medium flex items-center justify-center gap-2">
                  😾 {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-black text-white py-4 px-4 font-bold hover:bg-gray-800 focus:outline-none focus:ring-4 focus:ring-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg ${
                loading ? 'animate-pulse' : ''
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  😴 purring...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  🐾 pounce in
                </span>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-sm flex items-center justify-center gap-2">
            need an account? 
            <span className="text-black hover:underline cursor-pointer font-medium">
              adopt a profile 🐾
            </span>
          </p>
        </div>

        {/* Cute paw prints decoration */}
        <div className="mt-8 flex justify-center items-center space-x-2 text-gray-300">
          <span className="text-lg">🐾</span>
          <span className="text-xs">•</span>
          <span className="text-lg">🐾</span>
          <span className="text-xs">•</span>
          <span className="text-lg">🐾</span>
        </div>

        {/* Bottom cat faces */}
        <div className="mt-6 flex justify-center space-x-4 text-2xl opacity-20">
          <span>😸</span>
          <span>😺</span>
          <span>😻</span>
        </div>
      </div>
    </div>
  )
}
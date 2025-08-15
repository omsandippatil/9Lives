'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

interface UserProfile {
  java_lang_covered: number
  python_lang_covered: number
  sql_lang_covered: number
}

// Helper function to read cookies
const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null
  
  const cookies = document.cookie.split(';')
  const cookie = cookies.find(cookie => cookie.trim().startsWith(`${name}=`))
  return cookie ? decodeURIComponent(cookie.split('=')[1]) : null
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null

export default function LanguagesPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadUserProfile()
  }, [])

  const loadUserProfile = async () => {
    try {
      if (!supabase) {
        setLoading(false)
        return
      }

      const userId = getCookie('client-user-id') || localStorage.getItem('client-user-id') || localStorage.getItem('supabase-user-id')
      
      if (!userId) {
        setLoading(false)
        return
      }

      const { data: userProfile } = await supabase
        .from('users')
        .select('java_lang_covered, python_lang_covered, sql_lang_covered')
        .eq('id', userId)
        .single()

      if (userProfile) {
        setProfile(userProfile)
      }

      setLoading(false)
    } catch (err) {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-6 animate-pulse">🐱</div>
          <p className="font-mono text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  const javaProgress = profile?.java_lang_covered || 0
  const pythonProgress = profile?.python_lang_covered || 0
  const sqlProgress = profile?.sql_lang_covered || 0

  return (
    <div className="min-h-screen bg-white text-black font-mono">
      {/* Header */}
      <header className="border-b border-gray-100 py-4">
        <div className="w-full flex items-center px-2">
          <button 
            onClick={() => router.push('/home')}
            className="flex items-center gap-3 text-2xl"
          >
            <span className="animate-pulse">🐾</span>
            <h1 className="font-light">9Lives</h1>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">😺</div>
          <h2 className="text-xl font-light mb-2">Pick your paw-gramming language</h2>
        </div>

        {/* Language Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Java */}
          <div 
            onClick={() => router.push('/languages/java')}
            className="group bg-white border border-gray-100 hover:border-black cursor-pointer transition-all duration-300 hover:shadow-xl p-10"
          >
            <div className="text-center">
              <div className="text-7xl mb-6 group-hover:animate-bounce transition-all duration-300">☕</div>
              <h3 className="text-2xl font-mono mb-4 group-hover:text-black transition-colors">Java</h3>
              
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-gray-400 font-mono">Progress</span>
                  <span className="text-sm text-gray-600 font-mono font-medium">{javaProgress}/50</span>
                </div>
                <div className="w-full bg-gray-50 h-3 rounded-full overflow-hidden">
                  <div 
                    className="bg-black h-full transition-all duration-700 ease-out rounded-full"
                    style={{ width: `${Math.min((javaProgress / 50) * 100, 100)}%` }}
                  />
                </div>
              </div>
              
              <p className="text-base text-gray-500 font-mono group-hover:text-gray-700 transition-colors">Click to start your Java journey</p>
            </div>
          </div>

          {/* Python */}
          <div 
            onClick={() => router.push('/languages/python')}
            className="group bg-white border border-gray-100 hover:border-black cursor-pointer transition-all duration-300 hover:shadow-xl p-10"
          >
            <div className="text-center">
              <div className="text-7xl mb-6 group-hover:animate-bounce transition-all duration-300">🐍</div>
              <h3 className="text-2xl font-mono mb-4 group-hover:text-black transition-colors">Python</h3>
              
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-gray-400 font-mono">Progress</span>
                  <span className="text-sm text-gray-600 font-mono font-medium">{pythonProgress}/50</span>
                </div>
                <div className="w-full bg-gray-50 h-3 rounded-full overflow-hidden">
                  <div 
                    className="bg-black h-full transition-all duration-700 ease-out rounded-full"
                    style={{ width: `${Math.min((pythonProgress / 50) * 100, 100)}%` }}
                  />
                </div>
              </div>
              
              <p className="text-base text-gray-500 font-mono group-hover:text-gray-700 transition-colors">Click to start your Python journey</p>
            </div>
          </div>

          {/* SQL */}
          <div 
            onClick={() => router.push('/languages/sql')}
            className="group bg-white border border-gray-100 hover:border-black cursor-pointer transition-all duration-300 hover:shadow-xl p-10"
          >
            <div className="text-center">
              <div className="text-7xl mb-6 group-hover:animate-bounce transition-all duration-300">🗄️</div>
              <h3 className="text-2xl font-mono mb-4 group-hover:text-black transition-colors">SQL</h3>
              
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-gray-400 font-mono">Progress</span>
                  <span className="text-sm text-gray-600 font-mono font-medium">{sqlProgress}/50</span>
                </div>
                <div className="w-full bg-gray-50 h-3 rounded-full overflow-hidden">
                  <div 
                    className="bg-black h-full transition-all duration-700 ease-out rounded-full"
                    style={{ width: `${Math.min((sqlProgress / 50) * 100, 100)}%` }}
                  />
                </div>
              </div>
              
              <p className="text-base text-gray-500 font-mono group-hover:text-gray-700 transition-colors">Click to start your SQL journey</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
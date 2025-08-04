'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Page() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    checkAuthentication()
  }, [])

  const checkAuthentication = async () => {
    try {
      console.log('Checking authentication...')
      
      // Use the same cookie-based authentication as your home page
      const response = await fetch('/api/auth/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Essential for cookie-based auth
      })

      console.log('Auth check response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('Auth check successful, redirecting to home')
        
        if (data.profile) {
          // User is authenticated and has a profile, redirect to home
          router.push('/home')
        } else {
          console.log('No profile data, redirecting to login')
          router.push('/login')
        }
      } else {
        console.log('Auth check failed, redirecting to login')
        
        if (response.status === 401) {
          // Not authenticated
          router.push('/login')
        } else if (response.status === 404) {
          // User exists but no profile found
          setError('User profile not found. Please contact support.')
          router.push('/login')
        } else {
          // Other error
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          console.error('Auth API Error:', errorData)
          setError(errorData.error || `Authentication failed (${response.status})`)
          router.push('/login')
        }
      }
      
    } catch (err) {
      console.error('Authentication check error:', err)
      setError('Authentication error occurred')
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="text-6xl mb-4 animate-pulse">🐱</div>
          <p className="font-mono text-gray-600">Checking authentication...</p>
          <div className="w-32 h-0.5 bg-gray-100 overflow-hidden">
            <div className="h-full bg-black animate-pulse"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6 animate-bounce">😿</div>
          <div className="bg-white p-8 rounded-lg border border-gray-100">
            <div className="text-center">
              <p className="text-lg font-mono font-medium text-red-600 mb-2">Authentication Error</p>
              <p className="font-mono text-sm text-gray-600 mb-6">{error}</p>
              <div className="space-y-3">
                <button 
                  onClick={() => router.push('/login')}
                  className="w-full py-3 px-4 bg-black text-white font-mono hover:bg-gray-800 transition-colors"
                >
                  Go to Login
                </button>
                <button 
                  onClick={checkAuthentication}
                  className="w-full py-3 px-4 border border-gray-200 font-mono hover:border-black hover:bg-gray-50 transition-all duration-300"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // This should rarely be reached since we redirect in most cases
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="text-6xl mb-4">🐾</div>
        <p className="font-mono text-gray-600">Redirecting...</p>
      </div>
    </div>
  )
}
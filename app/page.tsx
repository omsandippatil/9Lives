'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface CachedUser {
  id: string
  email: string
  access_token: string
  refresh_token: string
  expires_at: number
}

export default function Page() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    checkAuthentication()
  }, [])

  // Helper function to get cookie value
  const getCookie = (name: string): string | null => {
    if (typeof document === 'undefined') return null
    
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${name}=`)
    if (parts.length === 2) {
      return parts.pop()?.split(';').shift() || null
    }
    return null
  }

  // Helper function to parse auth session from cookie
  const getCachedAuthSession = (): CachedUser | null => {
    try {
      const authSessionCookie = getCookie('auth-session')
      if (!authSessionCookie) return null

      const sessionData = JSON.parse(decodeURIComponent(authSessionCookie))
      
      // Validate required fields
      if (!sessionData.user_id || !sessionData.access_token || !sessionData.email) {
        console.log('Incomplete session data in cache')
        return null
      }

      // Check if token is expired (with 5-minute buffer)
      const expiresAt = sessionData.expires_at * 1000 // Convert to milliseconds
      const bufferTime = 5 * 60 * 1000 // 5 minutes buffer
      
      if (Date.now() >= (expiresAt - bufferTime)) {
        console.log('Cached session is expired')
        return null
      }

      return {
        id: sessionData.user_id,
        email: sessionData.email,
        access_token: sessionData.access_token,
        refresh_token: sessionData.refresh_token,
        expires_at: sessionData.expires_at
      }
    } catch (error) {
      console.error('Error parsing cached session:', error)
      return null
    }
  }

  // Fast client-side cache check first
  const checkCachedAuth = (): CachedUser | null => {
    console.log('Checking cached authentication...')
    
    // Try the structured auth-session cookie first
    const cachedSession = getCachedAuthSession()
    if (cachedSession) {
      console.log('Found valid cached session for user:', cachedSession.id)
      return cachedSession
    }

    // Fallback: check individual client cookies
    const userId = getCookie('client-user-id')
    const userEmail = getCookie('client-user-email')
    const accessToken = getCookie('client-access-token')

    if (userId && userEmail && accessToken) {
      console.log('Found cached auth data for user:', userId)
      return {
        id: userId,
        email: userEmail,
        access_token: accessToken,
        refresh_token: '', // Not critical for cache check
        expires_at: 0
      }
    }

    console.log('No valid cached authentication found')
    return null
  }

  const checkAuthentication = async () => {
    try {
      console.log('=== AUTH CHECK STARTED ===')
      
      // Step 1: Check cache first for instant redirect
      const cachedAuth = checkCachedAuth()
      
      if (cachedAuth) {
        console.log('Cache hit! Fast-tracking to home page for user:', cachedAuth.id)
        
        // Immediate redirect based on cache
        setLoading(false)
        router.push('/home')
        return
      }

      // Step 2: No cache hit, verify with server
      console.log('No cache, checking with server...')
      
      const response = await fetch('/api/auth/profile', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Essential for cookie-based auth
      })

      console.log('Server auth check response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Server auth check successful')
        
        if (data.profile) {
          // User is authenticated and has a profile, redirect to home
          console.log('Valid profile found, redirecting to home')
          router.push('/home')
        } else {
          console.log('No profile data, redirecting to login')
          router.push('/login')
        }
      } else {
        console.log('Server auth check failed, redirecting to login')
        
        // Clear any stale cookies
        if (typeof document !== 'undefined') {
          const cookiesToClear = [
            'auth-session',
            'client-access-token', 
            'client-user-id', 
            'client-user-email'
          ]
          
          cookiesToClear.forEach(cookieName => {
            document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
          })
          console.log('Cleared stale client cookies')
        }
        
        if (response.status === 401) {
          // Not authenticated
          router.push('/login')
        } else if (response.status === 404) {
          // User exists but no profile found
          setError('User profile not found. Please contact support.')
          setTimeout(() => router.push('/login'), 2000)
        } else {
          // Other error - handle JSON parsing more robustly
          let errorMessage = `Authentication failed (${response.status})`
          
          try {
            const responseText = await response.text()
            console.log('Raw response (first 200 chars):', responseText.substring(0, 200))
            
            if (responseText) {
              // Check if response looks like JSON before parsing
              const trimmedResponse = responseText.trim()
              
              if (trimmedResponse.startsWith('{') || trimmedResponse.startsWith('[')) {
                try {
                  const errorData = JSON.parse(trimmedResponse)
                  console.error('Auth API Error:', errorData)
                  errorMessage = errorData.error || errorData.message || errorMessage
                } catch (parseError) {
                  console.error('Failed to parse JSON response:', parseError)
                  console.error('Response appeared to be JSON but failed to parse')
                  errorMessage = `Invalid JSON response (${response.status})`
                }
              } else {
                // Response is not JSON (likely HTML error page or plain text)
                console.error('Non-JSON response received:', {
                  status: response.status,
                  statusText: response.statusText,
                  contentType: response.headers.get('content-type'),
                  isHTML: trimmedResponse.toLowerCase().includes('<html')
                })
                
                if (trimmedResponse.toLowerCase().includes('<html')) {
                  errorMessage = `Server returned HTML error page (${response.status})`
                } else {
                  errorMessage = `Server error: ${response.statusText || trimmedResponse.substring(0, 50) || 'Unknown'}`
                }
              }
            } else {
              console.error('Empty response from server')
              errorMessage = `Empty server response (${response.status})`
            }
          } catch (readError) {
            console.error('Failed to read response:', readError)
            errorMessage = `Failed to read server response (${response.status})`
          }
          
          setError(errorMessage)
          setTimeout(() => router.push('/login'), 3000)
        }
      }
      
    } catch (err) {
      console.error('Authentication check error:', err)
      setError('Authentication error occurred')
      setTimeout(() => router.push('/login'), 3000)
    } finally {
      setLoading(false)
    }
  }

  // Enhanced loading state with cache indicator
  if (loading) {
    const cachedAuth = checkCachedAuth()
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center space-y-4">
          <div className="text-6xl mb-4 animate-pulse">🐱</div>
          <p className="font-mono text-gray-600">
            {cachedAuth ? 'Fast login detected...' : 'Checking authentication...'}
          </p>
          <div className="w-32 h-0.5 bg-gray-100 overflow-hidden">
            <div className={`h-full ${cachedAuth ? 'bg-green-500' : 'bg-black'} animate-pulse`}></div>
          </div>
          {cachedAuth && (
            <p className="font-mono text-xs text-green-600">
              Welcome back, {cachedAuth.email}!
            </p>
          )}
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
                  onClick={() => {
                    setError('')
                    setLoading(true)
                    checkAuthentication()
                  }}
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
// app/api/auth/logout/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Debug environment variables
console.log('=== LOGOUT ROUTE ENVIRONMENT CHECK ===')
console.log('SUPABASE_URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('SUPABASE_SERVICE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
console.log('SUPABASE_ANON_KEY exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Import cache from login route (if in same module) or recreate reference
// Note: This assumes the cache is in a shared module or we recreate the reference
declare global {
  var uidCache: Map<string, string> | undefined
  var cacheTimestamps: Map<string, number> | undefined
}

// Initialize global cache if not exists (for consistency across routes)
if (!globalThis.uidCache) {
  globalThis.uidCache = new Map<string, string>()
}
if (!globalThis.cacheTimestamps) {
  globalThis.cacheTimestamps = new Map<string, number>()
}

const uidCache = globalThis.uidCache
const cacheTimestamps = globalThis.cacheTimestamps

// Helper function to clear cached UID
function clearCachedUID(email: string): boolean {
  const normalizedEmail = email.toLowerCase().trim()
  const hadCache = uidCache.has(normalizedEmail)
  
  uidCache.delete(normalizedEmail)
  cacheTimestamps.delete(normalizedEmail)
  
  if (hadCache) {
    console.log(`Cleared cached UID for: ${normalizedEmail}`)
  }
  
  return hadCache
}

// Helper function to get user email from various sources
function getUserEmail(request: NextRequest): string | null {
  try {
    // Try to get from cookies first
    const cookieStore = cookies()
    const userEmail = cookieStore.get('supabase-user-email')?.value || 
                     cookieStore.get('client-user-email')?.value
    
    if (userEmail) {
      return userEmail
    }

    // Try to get from auth-session cookie
    const authSession = cookieStore.get('auth-session')?.value
    if (authSession) {
      const sessionData = JSON.parse(authSession)
      if (sessionData.email) {
        return sessionData.email
      }
    }

    // Try to get from request headers
    const authHeader = request.headers.get('authorization')
    if (authHeader) {
      // This would require JWT decoding - simplified for now
      console.log('Auth header present but not decoded')
    }

    return null
  } catch (error) {
    console.error('Error getting user email:', error)
    return null
  }
}

// Helper function to revoke Supabase session
async function revokeSupabaseSession(accessToken: string): Promise<boolean> {
  try {
    console.log('Attempting to revoke Supabase session...')
    
    // Create a client with the user's access token
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    })

    const { error } = await userSupabase.auth.signOut()
    
    if (error) {
      console.error('Supabase signOut error:', error)
      return false
    }
    
    console.log('Supabase session revoked successfully')
    return true
  } catch (error) {
    console.error('Error revoking Supabase session:', error)
    return false
  }
}

// All cookies that need to be cleared
const COOKIES_TO_CLEAR = [
  'supabase-access-token',
  'supabase-refresh-token', 
  'supabase-user-id',
  'supabase-user-email',
  'client-access-token',
  'client-user-id', 
  'client-user-email',
  'auth-session'
]

export async function POST(request: NextRequest) {
  console.log('=== LOGOUT ROUTE STARTED ===')
  console.log('Request method:', request.method)
  console.log('Request URL:', request.url)
  console.log('Current cache size before logout:', uidCache.size)

  try {
    // Parse request body to check for options
    let requestBody: { 
      clearCache?: boolean, 
      email?: string,
      revokeSession?: boolean 
    } = {}
    
    try {
      const body = await request.json()
      requestBody = body || {}
      console.log('Logout options:', requestBody)
    } catch (parseError) {
      // Body is optional for logout, continue with defaults
      console.log('No request body provided, using defaults')
    }

    const { 
      clearCache = true, 
      email: providedEmail,
      revokeSession = true 
    } = requestBody

    // Get user email from various sources
    const userEmail = providedEmail || getUserEmail(request)
    console.log('User email for logout:', userEmail ? 'found' : 'not found')

    // Get access token for session revocation
    const cookieStore = cookies()
    const accessToken = cookieStore.get('supabase-access-token')?.value || 
                       cookieStore.get('client-access-token')?.value

    console.log('Access token for revocation:', accessToken ? 'found' : 'not found')

    // Step 1: Revoke Supabase session if requested and token available
    let sessionRevoked = false
    if (revokeSession && accessToken) {
      sessionRevoked = await revokeSupabaseSession(accessToken)
    } else {
      console.log('Skipping session revocation:', {
        revokeSession,
        hasAccessToken: !!accessToken
      })
    }

    // Step 2: Clear cached UID if requested and email available
    let cacheCleared = false
    if (clearCache && userEmail) {
      cacheCleared = clearCachedUID(userEmail)
    } else {
      console.log('Skipping cache clearing:', {
        clearCache,
        hasUserEmail: !!userEmail
      })
    }

    // Step 3: Prepare response
    const response = NextResponse.json({
      message: 'Logout successful',
      actions: {
        sessionRevoked,
        cacheCleared,
        cookiesCleared: true
      },
      debug: {
        hadUserEmail: !!userEmail,
        hadAccessToken: !!accessToken,
        cacheSize: uidCache.size,
        clearedEmail: userEmail || 'none'
      }
    })

    // Step 4: Clear all authentication cookies
    const isProduction = process.env.NODE_ENV === 'production'
    
    const clearOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      maxAge: 0, // Expire immediately
      path: '/'
    }

    const clearClientOptions = {
      httpOnly: false,
      secure: isProduction, 
      sameSite: 'lax' as const,
      maxAge: 0, // Expire immediately
      path: '/'
    }

    // Clear all cookies
    COOKIES_TO_CLEAR.forEach(cookieName => {
      if (cookieName.startsWith('client-') || cookieName === 'auth-session') {
        response.cookies.set(cookieName, '', clearClientOptions)
      } else {
        response.cookies.set(cookieName, '', clearOptions)
      }
      console.log(`Cleared cookie: ${cookieName}`)
    })

    // Step 5: Set additional security headers
    response.headers.set('Clear-Site-Data', '"cookies", "storage"')
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')

    console.log('Logout completed:', {
      sessionRevoked,
      cacheCleared,
      cookiesCleared: COOKIES_TO_CLEAR.length,
      remainingCacheSize: uidCache.size
    })
    
    console.log('=== LOGOUT ROUTE COMPLETED SUCCESSFULLY ===')
    return response

  } catch (error) {
    console.error('=== UNEXPECTED LOGOUT ERROR ===')
    console.error('Error type:', typeof error)
    console.error('Error name:', error instanceof Error ? error.name : 'Unknown')
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error')
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack')
    
    // Even if there's an error, try to clear cookies
    const errorResponse = NextResponse.json({ 
      error: 'Logout error occurred',
      details: error instanceof Error ? error.message : 'Unknown error',
      debug: 'Unexpected error in logout route',
      cookiesCleared: true // We'll still clear them below
    }, { status: 500 })

    // Clear cookies even on error
    const isProduction = process.env.NODE_ENV === 'production'
    const clearOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      maxAge: 0,
      path: '/'
    }

    const clearClientOptions = {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'lax' as const, 
      maxAge: 0,
      path: '/'
    }

    COOKIES_TO_CLEAR.forEach(cookieName => {
      if (cookieName.startsWith('client-') || cookieName === 'auth-session') {
        errorResponse.cookies.set(cookieName, '', clearClientOptions)
      } else {
        errorResponse.cookies.set(cookieName, '', clearOptions)
      }
    })

    return errorResponse
  }
}

// GET method for simple logout (no body required)
export async function GET(request: NextRequest) {
  console.log('=== LOGOUT GET REQUEST ===')
  
  // Redirect GET to POST with default options
  return POST(request)
}

// Add OPTIONS handler for CORS
export async function OPTIONS(request: NextRequest) {
  console.log('=== LOGOUT OPTIONS REQUEST ===')
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

// Export helper functions for manual cache management
export function clearUserCache(email: string): boolean {
  return clearCachedUID(email)
}

export function clearAllCache(): number {
  const clearedCount = uidCache.size
  uidCache.clear()
  cacheTimestamps.clear()
  console.log(`Cleared all cached UIDs: ${clearedCount} entries`)
  return clearedCount
}

export function getLogoutCacheStats() {
  return {
    size: uidCache.size,
    entries: Array.from(uidCache.keys()),
    timestamps: Array.from(cacheTimestamps.entries())
  }
}
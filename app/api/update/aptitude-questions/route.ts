// app/api/update/aptitude-questions/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Use service key for admin operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Regular client for user auth
const supabase = createClient(supabaseUrl, supabaseKey)

// Handle OPTIONS for CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== UPDATE APTITUDE QUESTIONS API START ===')
    
    let userId: string | null = null
    let userEmail: string | null = null

    // Method 1: Try authorization header first
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      console.log('Attempting Bearer token auth...')
      
      const { data: { user }, error } = await supabase.auth.getUser(token)
      
      if (user && !error) {
        userId = user.id
        userEmail = user.email ?? null
        console.log('Bearer auth successful:', { userId, userEmail })
      } else {
        console.log('Bearer auth failed:', error?.message)
      }
    }

    // Method 2: Try cookies if Bearer token failed
    if (!userId) {
      console.log('Attempting cookie-based auth...')
      const cookieStore = await cookies()
      
      // Get all relevant cookies - convert undefined to null
      const accessToken = cookieStore.get('supabase-access-token')?.value ?? null
      const refreshToken = cookieStore.get('supabase-refresh-token')?.value ?? null
      const userIdCookie = cookieStore.get('supabase-user-id')?.value ?? null
      const userEmailCookie = cookieStore.get('supabase-user-email')?.value ?? null

      console.log('Available cookies:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        userIdCookie,
        userEmailCookie
      })

      if (accessToken) {
        const { data: { user }, error } = await supabase.auth.getUser(accessToken)
        
        if (user && !error) {
          userId = user.id
          userEmail = user.email ?? null
          console.log('Cookie auth successful:', { userId, userEmail })
        } else {
          console.log('Cookie auth failed:', error?.message)
          // Fallback to cookie values
          userId = userIdCookie ?? null
          userEmail = userEmailCookie ?? null
        }
      } else {
        // Direct fallback to cookie values
        userId = userIdCookie ?? null
        userEmail = userEmailCookie ?? null
        console.log('Using direct cookie values:', { userId, userEmail })
      }
    }

    // Final validation
    if (!userId && !userEmail) {
      console.log('No authentication method succeeded')
      return NextResponse.json(
        { 
          error: 'Authentication required', 
          details: 'No valid user ID or email found in request'
        },
        { status: 401 }
      )
    }

    console.log('Final auth state:', { userId, userEmail })

    // Get current user profile - try by ID first, then by email
    let currentProfile = null
    let finalUserId = userId

    if (userId) {
      console.log('Fetching profile by user ID:', userId)
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('id, email, aptitude_questions_attempted')
        .eq('id', userId)
        .single()

      if (data && !error) {
        currentProfile = data
        finalUserId = data.id
        console.log('Found profile by ID:', currentProfile)
      } else {
        console.log('Profile fetch by ID failed:', error?.message)
      }
    }

    // If no profile found by ID and we have email, try by email
    if (!currentProfile && userEmail) {
      console.log('Fetching profile by email:', userEmail)
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('id, email, aptitude_questions_attempted')
        .eq('email', userEmail.toLowerCase())
        .single()

      if (data && !error) {
        currentProfile = data
        finalUserId = data.id
        console.log('Found profile by email:', currentProfile)
      } else {
        console.log('Profile fetch by email failed:', error?.message)
      }
    }

    if (!currentProfile || !finalUserId) {
      console.log('No user profile found')
      return NextResponse.json(
        { 
          error: 'User profile not found',
          details: 'Could not locate user profile in database',
          debugInfo: { userId, userEmail }
        },
        { status: 404 }
      )
    }

    // Calculate new count
    const currentCount = currentProfile.aptitude_questions_attempted || 0
    const newCount = currentCount + 1

    console.log('Updating aptitude questions:', {
      userId: finalUserId,
      currentCount,
      newCount
    })

    // Update the aptitude questions count
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('users')
      .update({ 
        aptitude_questions_attempted: newCount,
        updated_at: new Date().toISOString()
      })
      .eq('id', finalUserId)
      .select('id, email, aptitude_questions_attempted')
      .single()

    if (updateError) {
      console.error('Update failed:', updateError)
      return NextResponse.json(
        { 
          error: 'Failed to update aptitude questions count',
          details: updateError.message,
          debugInfo: { finalUserId, newCount }
        },
        { status: 400 }
      )
    }

    if (!updatedProfile) {
      console.error('Update returned no data')
      return NextResponse.json(
        { 
          error: 'Update completed but no data returned',
          details: 'The update may have succeeded but verification failed'
        },
        { status: 500 }
      )
    }

    console.log('Update successful:', updatedProfile)
    console.log('=== UPDATE APTITUDE QUESTIONS API END ===')

    return NextResponse.json({ 
      success: true,
      message: `Successfully updated aptitude questions from ${currentCount} to ${newCount}`,
      data: {
        userId: updatedProfile.id,
        email: updatedProfile.email,
        previousCount: currentCount,
        newCount: updatedProfile.aptitude_questions_attempted,
        incrementedBy: 1
      }
    })

  } catch (error) {
    console.error('Unexpected error in aptitude questions update:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Handle unsupported methods
const unsupportedMethod = (method: string) => {
  console.log(`${method} request received - this endpoint only accepts POST`)
  return NextResponse.json(
    { 
      error: 'Method not allowed', 
      message: 'This endpoint only accepts POST requests',
      allowedMethods: ['POST']
    },
    { 
      status: 405, 
      headers: { 'Allow': 'POST, OPTIONS' } 
    }
  )
}

export async function GET(request: NextRequest) {
  return unsupportedMethod('GET')
}

export async function PUT(request: NextRequest) {
  return unsupportedMethod('PUT')
}

export async function DELETE(request: NextRequest) {
  return unsupportedMethod('DELETE')
}

export async function PATCH(request: NextRequest) {
  return unsupportedMethod('PATCH')
}
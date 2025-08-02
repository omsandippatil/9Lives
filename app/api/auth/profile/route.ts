// app/api/auth/profile/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function GET(request: NextRequest) {
  try {
    console.log('=== PROFILE API DEBUG ===')
    
    let user = null
    let authError = null
    let userId = null

    // Method 1: Try authorization header first
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      console.log('Using Bearer token')
      const result = await supabase.auth.getUser(token)
      user = result.data.user
      authError = result.error
      userId = user?.id
      
      if (authError) {
        console.log('Bearer token error:', authError.message)
      }
    }

    // Method 2: Try cookies if Bearer token failed
    if (!user) {
      console.log('Trying cookie-based auth')
      const cookieStore = await cookies()
      const accessToken = cookieStore.get('supabase-access-token')?.value
      const userIdFromCookie = cookieStore.get('supabase-user-id')?.value

      if (accessToken) {
        const result = await supabase.auth.getUser(accessToken)
        user = result.data.user
        authError = result.error
        userId = user?.id || userIdFromCookie
        
        if (authError) {
          console.log('Cookie token error:', authError.message)
        }
      } else if (userIdFromCookie) {
        userId = userIdFromCookie
        console.log('Using user ID from cookie (no token verification):', userId)
      }
    }

    console.log('Auth result:', { userId, userEmail: user?.email, error: authError?.message })

    if (!userId) {
      return NextResponse.json(
        { 
          error: 'Not authenticated', 
          details: 'No user ID available',
          debug: 'Authentication failed - no valid token or cookie'
        },
        { status: 401 }
      )
    }

    console.log('Fetching profile for user ID:', userId)

    // Use admin client for more reliable data fetching
    const { data: profile, error } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        email,
        coding_questions_attempted,
        technical_questions_attempted, 
        fundamental_questions_attempted,
        tech_topics_covered,
        current_streak,
        total_points,
        created_at,
        updated_at
      `)
      .eq('id', userId)
      .single()

    console.log('Profile query result:', { profile: !!profile, error: error?.message })

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('User profile not found - UUID mismatch possible')
        
        // Try to find user by email as fallback
        if (user?.email) {
          console.log('Trying to find user by email:', user.email)
          const { data: emailProfile, error: emailError } = await supabaseAdmin
            .from('users')
            .select(`
              id,
              email,
              coding_questions_attempted,
              technical_questions_attempted, 
              fundamental_questions_attempted,
              tech_topics_covered,
              current_streak,
              total_points,
              created_at,
              updated_at
            `)
            .eq('email', user.email.toLowerCase())
            .single()
            
          if (emailProfile && !emailError) {
            console.log('Found user by email, updating ID...')
            // Update the user record with correct UUID
            const { error: updateError } = await supabaseAdmin
              .from('users')
              .update({ id: userId })
              .eq('email', user.email.toLowerCase())
              
            if (!updateError) {
              return NextResponse.json({ 
                profile: {
                  ...emailProfile,
                  id: userId, // Use the correct auth UUID
                  aptitude_questions_attempted: 0,
                  total_questions_attempted: (
                    (emailProfile.coding_questions_attempted || 0) +
                    (emailProfile.technical_questions_attempted || 0) +
                    (emailProfile.fundamental_questions_attempted || 0)
                  ),
                  categories: {
                    coding: emailProfile.coding_questions_attempted || 0,
                    technical: emailProfile.technical_questions_attempted || 0,
                    fundamental: emailProfile.fundamental_questions_attempted || 0,
                    aptitude: 0
                  },
                  progress: {
                    tech_topics_covered: emailProfile.tech_topics_covered || 0,
                    current_streak: emailProfile.current_streak || 0,
                    total_points: emailProfile.total_points || 0
                  }
                },
                debug: 'Profile found by email and ID updated'
              })
            }
          }
        }
        
        return NextResponse.json(
          { 
            error: 'User profile not found',
            details: 'Profile not found for authenticated user',
            debug: 'UUID mismatch between auth and users table',
            userId: userId
          },
          { status: 404 }
        )
      }
      
      console.error('Profile fetch error:', error)
      return NextResponse.json(
        { 
          error: 'Failed to fetch profile',
          details: error.message,
          code: error.code
        },
        { status: 400 }
      )
    }

    // Add aptitude statistics and enhanced data structure
    const profileWithAptitude = {
      ...profile,
      aptitude_questions_attempted: 0,
      total_questions_attempted: (
        (profile.coding_questions_attempted || 0) +
        (profile.technical_questions_attempted || 0) +
        (profile.fundamental_questions_attempted || 0)
      ),
      categories: {
        coding: profile.coding_questions_attempted || 0,
        technical: profile.technical_questions_attempted || 0,
        fundamental: profile.fundamental_questions_attempted || 0,
        aptitude: 0
      },
      progress: {
        tech_topics_covered: profile.tech_topics_covered || 0,
        current_streak: profile.current_streak || 0,
        total_points: profile.total_points || 0
      }
    }

    return NextResponse.json({ 
      profile: profileWithAptitude,
      debug: 'Profile fetched successfully'
    })

  } catch (error) {
    console.error('Unexpected error in profile route:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    console.log('=== PROFILE UPDATE API DEBUG ===')
    
    // Get authenticated user ID
    let userId = null
    let user = null
    
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '')
      const result = await supabase.auth.getUser(token)
      user = result.data.user
      userId = user?.id
    }

    if (!userId) {
      const cookieStore = await cookies()
      const accessToken = cookieStore.get('supabase-access-token')?.value
      const userIdFromCookie = cookieStore.get('supabase-user-id')?.value

      if (accessToken) {
        const result = await supabase.auth.getUser(accessToken)
        user = result.data.user
        userId = user?.id || userIdFromCookie
      } else if (userIdFromCookie) {
        userId = userIdFromCookie
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get request body
    const body = await request.json()
    const {
      coding_questions_attempted,
      technical_questions_attempted,
      fundamental_questions_attempted,
      aptitude_questions_attempted,
      tech_topics_covered,
      current_streak,
      total_points
    } = body

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (coding_questions_attempted !== undefined) {
      updateData.coding_questions_attempted = coding_questions_attempted
    }
    if (technical_questions_attempted !== undefined) {
      updateData.technical_questions_attempted = technical_questions_attempted
    }
    if (fundamental_questions_attempted !== undefined) {
      updateData.fundamental_questions_attempted = fundamental_questions_attempted
    }
    if (tech_topics_covered !== undefined) {
      updateData.tech_topics_covered = tech_topics_covered
    }
    if (current_streak !== undefined) {
      updateData.current_streak = current_streak
    }
    if (total_points !== undefined) {
      updateData.total_points = total_points
    }

    console.log('Updating profile for user ID:', userId, 'with:', updateData)

    // Use admin client for reliable updates
    const { data: updatedProfile, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Profile update error:', error)
      return NextResponse.json(
        { 
          error: 'Failed to update profile',
          details: error.message
        },
        { status: 400 }
      )
    }

    console.log('Profile updated successfully')
    return NextResponse.json({ 
      profile: updatedProfile,
      message: 'Profile updated successfully'
    })

  } catch (error) {
    console.error('Unexpected error in profile update:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
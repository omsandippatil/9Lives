// app/api/add/points/route.ts
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
  return handleAddPoints(request, 'GET');
}

export async function POST(request: NextRequest) {
  return handleAddPoints(request, 'POST');
}

async function handleAddPoints(request: NextRequest, method: 'GET' | 'POST') {
  try {
    console.log('=== ADD POINTS API DEBUG ===')
    console.log('Method:', method)
    
    // Get points from either query params (GET) or request body (POST)
    let points;
    if (method === 'GET') {
      const { searchParams } = new URL(request.url)
      points = searchParams.get('points')
    } else {
      const body = await request.json()
      points = body.points
    }

    // Validate points parameter
    if (!points || isNaN(Number(points)) || Number(points) <= 0) {
      return NextResponse.json(
        { 
          error: 'Invalid points parameter',
          details: 'Points must be a valid positive number'
        },
        { status: 400 }
      )
    }

    const pointsToAdd = Number(points)
    
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

    console.log('Adding points for user ID:', userId, 'Points to add:', pointsToAdd)

    // First, get current total_points
    const { data: currentProfile, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('total_points')
      .eq('id', userId)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        // Try to find user by email as fallback
        if (user?.email) {
          console.log('Trying to find user by email:', user.email)
          const { data: emailProfile, error: emailError } = await supabaseAdmin
            .from('users')
            .select('total_points')
            .eq('email', user.email.toLowerCase())
            .single()
            
          if (emailProfile && !emailError) {
            console.log('Found user by email, updating points...')
            const newTotal = (emailProfile.total_points || 0) + pointsToAdd
            
            const { data: updatedProfile, error: updateError } = await supabaseAdmin
              .from('users')
              .update({ 
                total_points: newTotal,
                updated_at: new Date().toISOString()
              })
              .eq('email', user.email.toLowerCase())
              .select('total_points')
              .single()
              
            if (updateError) {
              console.error('Points update error:', updateError)
              return NextResponse.json(
                { 
                  error: 'Failed to update points',
                  details: updateError.message
                },
                { status: 400 }
              )
            }
            
            return NextResponse.json({ 
              success: true,
              message: `Successfully added ${pointsToAdd} points`,
              previous_points: emailProfile.total_points || 0,
              new_total: updatedProfile.total_points,
              points_added: pointsToAdd
            })
          }
        }
        
        return NextResponse.json(
          { 
            error: 'User profile not found',
            details: 'Profile not found for authenticated user',
            userId: userId
          },
          { status: 404 }
        )
      }
      
      console.error('Profile fetch error:', fetchError)
      return NextResponse.json(
        { 
          error: 'Failed to fetch current points',
          details: fetchError.message
        },
        { status: 400 }
      )
    }

    // Calculate new total points
    const currentPoints = currentProfile.total_points || 0
    const newTotal = currentPoints + pointsToAdd

    // Update the points
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('users')
      .update({ 
        total_points: newTotal,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('total_points')
      .single()

    if (updateError) {
      console.error('Points update error:', updateError)
      return NextResponse.json(
        { 
          error: 'Failed to update points',
          details: updateError.message
        },
        { status: 400 }
      )
    }

    console.log('Points updated successfully')
    return NextResponse.json({ 
      success: true,
      message: `Successfully added ${pointsToAdd} points`,
      previous_points: currentPoints,
      new_total: updatedProfile.total_points,
      points_added: pointsToAdd
    })

  } catch (error) {
    console.error('Unexpected error in add points route:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
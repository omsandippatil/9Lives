// app/api/update/streak/route.ts
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
  return handleUpdateStreak(request, 'GET');
}

export async function POST(request: NextRequest) {
  return handleUpdateStreak(request, 'POST');
}

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0]; // Returns YYYY-MM-DD format
}

function getYesterdayDateString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().split('T')[0];
}

async function handleUpdateStreak(request: NextRequest, method: 'GET' | 'POST') {
  try {
    console.log('=== UPDATE STREAK API DEBUG ===')
    console.log('Method:', method)
    
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

    const todayDate = getTodayDateString()
    console.log('Processing streak for user ID:', userId, 'Date:', todayDate)

    // Get current streak data
    const { data: currentProfile, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('current_streak')
      .eq('id', userId)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        // Try to find user by email as fallback
        if (user?.email) {
          console.log('Trying to find user by email:', user.email)
          const { data: emailProfile, error: emailError } = await supabaseAdmin
            .from('users')
            .select('current_streak')
            .eq('email', user.email.toLowerCase())
            .single()
            
          if (emailProfile && !emailError) {
            return await processStreakUpdate(user.email.toLowerCase(), emailProfile, todayDate, 'email')
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
          error: 'Failed to fetch current streak data',
          details: fetchError.message
        },
        { status: 400 }
      )
    }

    return await processStreakUpdate(userId, currentProfile, todayDate, 'id')

  } catch (error) {
    console.error('Unexpected error in update streak route:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function processStreakUpdate(
  userIdentifier: string, 
  profile: any, 
  todayDate: string, 
  identifierType: 'id' | 'email'
) {
  // Parse current streak data [date, streak_number]
  const currentStreakData = profile.current_streak || [null, 0]
  const lastDate = currentStreakData[0]
  const currentStreak = currentStreakData[1] || 0

  console.log('Current streak data:', currentStreakData)

  // Check if already updated today
  if (lastDate === todayDate) {
    console.log('Streak already updated today')
    return NextResponse.json({ 
      success: true,
      message: 'Streak already updated today',
      current_streak: currentStreak,
      last_update_date: lastDate,
      action: 'no_change'
    })
  }

  const yesterdayDate = getYesterdayDateString()
  let newStreak: number
  let action: string

  // Determine new streak value
  if (!lastDate) {
    // First time tracking streak
    newStreak = 1
    action = 'started'
  } else if (lastDate === yesterdayDate) {
    // Consecutive day - increment streak
    newStreak = currentStreak + 1
    action = 'incremented'
  } else {
    // Gap in streak - reset to 1
    newStreak = 1
    action = 'reset'
  }

  // Create new streak data [date, streak]
  const newStreakData = [todayDate, newStreak]

  console.log('Updating streak:', { newStreakData, action })

  // Update the database
  const updateData = {
    current_streak: newStreakData,
    updated_at: new Date().toISOString()
  }

  const query = identifierType === 'id' 
    ? supabaseAdmin.from('users').update(updateData).eq('id', userIdentifier)
    : supabaseAdmin.from('users').update(updateData).eq('email', userIdentifier)

  const { data: updatedProfile, error: updateError } = await query
    .select('current_streak')
    .single()

  if (updateError) {
    console.error('Streak update error:', updateError)
    return NextResponse.json(
      { 
        error: 'Failed to update streak',
        details: updateError.message
      },
      { status: 400 }
    )
  }

  console.log('Streak updated successfully')
  return NextResponse.json({ 
    success: true,
    message: `Streak ${action} successfully`,
    previous_streak: currentStreak,
    current_streak: updatedProfile.current_streak[1],
    last_update_date: updatedProfile.current_streak[0],
    action: action
  })
}
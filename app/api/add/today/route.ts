// app/api/increment/count/route.ts
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

// Valid columns that can be incremented
const VALID_COLUMNS = [
  'coding_questions_attempted',
  'technical_questions_attempted',
  'fundamental_questions_attempted',
  'tech_topics_covered',
  'aptitude_questions_attempted',
  'language_covered',
  'hr_questions_attempted',
  'artificial_intelligence_questions_attempted',
  'blueprint_questions_attempted'
]

export async function GET(request: NextRequest) {
  return handleIncrementCount(request, 'GET');
}

export async function POST(request: NextRequest) {
  return handleIncrementCount(request, 'POST');
}

async function handleIncrementCount(request: NextRequest, method: 'GET' | 'POST') {
  try {
    console.log('=== INCREMENT COUNT API DEBUG ===')
    console.log('Method:', method)
    
    // Get the count parameter from URL
    const { searchParams } = new URL(request.url)
    const countColumn = searchParams.get('count')
    
    if (!countColumn) {
      return NextResponse.json(
        { 
          error: 'Missing count parameter',
          details: 'Please specify which column to increment using ?count=column_name'
        },
        { status: 400 }
      )
    }

    // Validate the column name
    if (!VALID_COLUMNS.includes(countColumn)) {
      return NextResponse.json(
        { 
          error: 'Invalid column name',
          details: `Column '${countColumn}' is not valid. Valid columns: ${VALID_COLUMNS.join(', ')}`
        },
        { status: 400 }
      )
    }

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

    console.log(`Processing increment for user ID: ${userId}, Column: ${countColumn}`)

    // Get current value of the column
    const { data: currentProfile, error: fetchError } = await supabaseAdmin
      .from('users')
      .select(`id, ${countColumn}`)
      .eq('id', userId)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        // Try to find user by email as fallback
        if (user?.email) {
          console.log('Trying to find user by email:', user.email)
          const { data: emailProfile, error: emailError } = await supabaseAdmin
            .from('users')
            .select(`id, ${countColumn}`)
            .eq('email', user.email.toLowerCase())
            .single()
            
          if (emailProfile && !emailError) {
            return await processCountIncrement(user.email.toLowerCase(), emailProfile, countColumn, 'email')
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
          error: 'Failed to fetch current profile data',
          details: fetchError.message
        },
        { status: 400 }
      )
    }

    return await processCountIncrement(userId, currentProfile, countColumn, 'id')

  } catch (error) {
    console.error('Unexpected error in increment count route:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function processCountIncrement(
  userIdentifier: string, 
  profile: Record<string, any>, 
  countColumn: string, 
  identifierType: 'id' | 'email'
) {
  // Get current count value (default to 0 if null)
  const currentCount = (profile[countColumn] as number) || 0
  const newCount = currentCount + 1

  console.log(`Current ${countColumn}:`, currentCount, '-> New count:', newCount)

  // Update the database
  const updateData: Record<string, any> = {
    [countColumn]: newCount,
    updated_at: new Date().toISOString()
  }

  const query = identifierType === 'id' 
    ? supabaseAdmin.from('users').update(updateData).eq('id', userIdentifier)
    : supabaseAdmin.from('users').update(updateData).eq('email', userIdentifier)

  const { data: updatedProfile, error: updateError } = await query
    .select(`id, ${countColumn}`)
    .single()

  if (updateError) {
    console.error('Count update error:', updateError)
    return NextResponse.json(
      { 
        error: 'Failed to update count',
        details: updateError.message
      },
      { status: 400 }
    )
  }

  console.log(`Count updated successfully for column: ${countColumn}`)
  return NextResponse.json({ 
    success: true,
    message: `${countColumn} incremented successfully`,
    column: countColumn,
    previous_count: currentCount,
    current_count: (updatedProfile as Record<string, any>)[countColumn],
    user_id: (updatedProfile as Record<string, any>).id
  })
}
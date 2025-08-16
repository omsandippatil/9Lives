// app/api/increment/today/route.ts
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

// Allowed columns that can be incremented (excluding 'contact' and 'uid')
const ALLOWED_COLUMNS = [
  'coding_questions_attempted',
  'technical_questions_attempted', 
  'fundamental_questions_attempted',
  'tech_topics_covered',
  'aptitude_questions_attempted',
  'hr_questions_attempted',
  'artificial_intelligence_topics_covered',
  'system_design_covered',
  'java_lang_covered',
  'python_lang_covered',
  'sql_lang_covered'
]

export async function GET(request: NextRequest) {
  return handleIncrementColumn(request, 'GET');
}

export async function POST(request: NextRequest) {
  return handleIncrementColumn(request, 'POST');
}

async function handleIncrementColumn(request: NextRequest, method: 'GET' | 'POST') {
  try {
    console.log('=== INCREMENT TODAY COLUMN API DEBUG ===')
    console.log('Method:', method)

    // Get column to increment from URL params
    const { searchParams } = new URL(request.url)
    const columnToIncrement = searchParams.get('inc')
    
    if (!columnToIncrement) {
      return NextResponse.json(
        { 
          error: 'Missing column parameter',
          details: 'Please provide an inc parameter with the column name to increment',
          allowed_columns: ALLOWED_COLUMNS
        },
        { status: 400 }
      )
    }

    // Validate column name
    if (!ALLOWED_COLUMNS.includes(columnToIncrement)) {
      return NextResponse.json(
        { 
          error: 'Invalid column name',
          details: `Column '${columnToIncrement}' is not allowed for increment`,
          allowed_columns: ALLOWED_COLUMNS
        },
        { status: 400 }
      )
    }

    // Authenticate user (same logic as streak API)
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

    console.log('Processing increment for user ID:', userId, 'Column:', columnToIncrement)

    // Check if record exists for today
    const { data: existingRecord, error: fetchError } = await supabaseAdmin
      .from('today')
      .select(`uid, ${columnToIncrement}`)
      .eq('uid', userId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      // Error other than "not found"
      console.error('Fetch error:', fetchError)
      return NextResponse.json(
        { 
          error: 'Failed to fetch current data',
          details: fetchError.message
        },
        { status: 400 }
      )
    }

    let currentValue = 0
    let newValue = 1

    if (existingRecord) {
      // Record exists, increment the column
      currentValue = (existingRecord as any)[columnToIncrement] || 0
      newValue = currentValue + 1

      const { data: updatedRecord, error: updateError } = await supabaseAdmin
        .from('today')
        .update({ [columnToIncrement]: newValue } as any)
        .eq('uid', userId)
        .select(`uid, ${columnToIncrement}`)
        .single()

      if (updateError) {
        console.error('Update error:', updateError)
        return NextResponse.json(
          { 
            error: 'Failed to increment column',
            details: updateError.message
          },
          { status: 400 }
        )
      }

      console.log('Column incremented successfully')
      return NextResponse.json({ 
        success: true,
        message: `${columnToIncrement} incremented successfully`,
        column: columnToIncrement,
        previous_value: currentValue,
        current_value: (updatedRecord as any)[columnToIncrement],
        action: 'incremented'
      })

    } else {
      // Record doesn't exist, create new record with incremented column
      const insertData = {
        uid: userId,
        [columnToIncrement]: 1
      } as any

      const { data: newRecord, error: insertError } = await supabaseAdmin
        .from('today')
        .insert(insertData)
        .select(`uid, ${columnToIncrement}`)
        .single()

      if (insertError) {
        console.error('Insert error:', insertError)
        return NextResponse.json(
          { 
            error: 'Failed to create record and increment column',
            details: insertError.message
          },
          { status: 400 }
        )
      }

      console.log('New record created and column set successfully')
      return NextResponse.json({ 
        success: true,
        message: `${columnToIncrement} incremented successfully (new record created)`,
        column: columnToIncrement,
        previous_value: 0,
        current_value: (newRecord as any)[columnToIncrement],
        action: 'created_and_incremented'
      })
    }

  } catch (error) {
    console.error('Unexpected error in increment today column route:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
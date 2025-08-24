// app/api/fetch/week/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const API_KEY = process.env.API_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function GET(request: NextRequest) {
  try {
    console.log('=== FETCH WEEK DATA API DEBUG ===')

    // Get URL parameters
    const { searchParams } = new URL(request.url)
    const providedApiKey = searchParams.get('api_key')
    const uid = searchParams.get('uid')

    // Validate API key
    if (!providedApiKey || providedApiKey !== API_KEY) {
      return NextResponse.json(
        { 
          error: 'Invalid API key',
          details: 'Please provide a valid api_key parameter'
        },
        { status: 401 }
      )
    }

    // Validate UID parameter
    if (!uid) {
      return NextResponse.json(
        { 
          error: 'Missing UID parameter',
          details: 'Please provide a uid parameter'
        },
        { status: 400 }
      )
    }

    console.log('Fetching week data for UID:', uid)

    // Fetch week data for the specific UID
    const { data: weekData, error: fetchError } = await supabaseAdmin
      .from('week')
      .select('*')
      .eq('uid', uid)
      .single()

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        // No data found for this UID
        return NextResponse.json(
          { 
            success: false,
            error: 'No data found',
            details: `No week data found for UID: ${uid}`,
            uid: uid
          },
          { status: 404 }
        )
      } else {
        // Other database error
        console.error('Database fetch error:', fetchError)
        return NextResponse.json(
          { 
            error: 'Database error',
            details: fetchError.message
          },
          { status: 500 }
        )
      }
    }

    // Parse comma-separated values into arrays and calculate totals
    const parsedData = {
      uid: weekData.uid,
      raw_data: {
        coding_questions_attempted: weekData.coding_questions_attempted || '',
        technical_questions_attempted: weekData.technical_questions_attempted || '',
        fundamental_questions_attempted: weekData.fundamental_questions_attempted || '',
        tech_topics_covered: weekData.tech_topics_covered || '',
        aptitude_questions_attempted: weekData.aptitude_questions_attempted || '',
        hr_questions_attempted: weekData.hr_questions_attempted || '',
        ai_ml_covered: weekData.ai_ml_covered || '',
        system_design_covered: weekData.system_design_covered || '',
        java_lang_covered: weekData.java_lang_covered || '',
        python_lang_covered: weekData.python_lang_covered || '',
        sql_lang_covered: weekData.sql_lang_covered || '',
        focus: weekData.focus || ''
      },
      parsed_arrays: {
        coding_questions_attempted: parseCommaSeparated(weekData.coding_questions_attempted),
        technical_questions_attempted: parseCommaSeparated(weekData.technical_questions_attempted),
        fundamental_questions_attempted: parseCommaSeparated(weekData.fundamental_questions_attempted),
        tech_topics_covered: parseCommaSeparated(weekData.tech_topics_covered),
        aptitude_questions_attempted: parseCommaSeparated(weekData.aptitude_questions_attempted),
        hr_questions_attempted: parseCommaSeparated(weekData.hr_questions_attempted),
        ai_ml_covered: parseCommaSeparated(weekData.ai_ml_covered),
        system_design_covered: parseCommaSeparated(weekData.system_design_covered),
        java_lang_covered: parseCommaSeparated(weekData.java_lang_covered),
        python_lang_covered: parseCommaSeparated(weekData.python_lang_covered),
        sql_lang_covered: parseCommaSeparated(weekData.sql_lang_covered),
        focus: parseCommaSeparated(weekData.focus)
      }
    }

    // Calculate totals and statistics
    const statistics = {
      coding_questions_attempted: calculateStats(parsedData.parsed_arrays.coding_questions_attempted),
      technical_questions_attempted: calculateStats(parsedData.parsed_arrays.technical_questions_attempted),
      fundamental_questions_attempted: calculateStats(parsedData.parsed_arrays.fundamental_questions_attempted),
      tech_topics_covered: calculateStats(parsedData.parsed_arrays.tech_topics_covered),
      aptitude_questions_attempted: calculateStats(parsedData.parsed_arrays.aptitude_questions_attempted),
      hr_questions_attempted: calculateStats(parsedData.parsed_arrays.hr_questions_attempted),
      ai_ml_covered: calculateStats(parsedData.parsed_arrays.ai_ml_covered),
      system_design_covered: calculateStats(parsedData.parsed_arrays.system_design_covered),
      java_lang_covered: calculateStats(parsedData.parsed_arrays.java_lang_covered),
      python_lang_covered: calculateStats(parsedData.parsed_arrays.python_lang_covered),
      sql_lang_covered: calculateStats(parsedData.parsed_arrays.sql_lang_covered),
      focus: calculateStats(parsedData.parsed_arrays.focus)
    }

    console.log('Week data fetched successfully for UID:', uid)

    return NextResponse.json({
      success: true,
      message: 'Week data fetched successfully',
      uid: uid,
      data: parsedData,
      statistics: statistics,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Unexpected error in fetch week data route:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

// Helper function to parse comma-separated values
function parseCommaSeparated(value: string | null): number[] {
  if (!value || value.trim() === '') {
    return []
  }
  return value.split(',').map(v => parseInt(v.trim()) || 0)
}

// Helper function to calculate statistics from array
function calculateStats(numbers: number[]) {
  if (numbers.length === 0) {
    return {
      total: 0,
      average: 0,
      max: 0,
      min: 0,
      days: 0,
      daily_values: []
    }
  }

  const total = numbers.reduce((sum, num) => sum + num, 0)
  const max = Math.max(...numbers)
  const min = Math.min(...numbers)
  const average = Math.round((total / numbers.length) * 100) / 100

  return {
    total: total,
    average: average,
    max: max,
    min: min,
    days: numbers.length,
    daily_values: numbers
  }
}
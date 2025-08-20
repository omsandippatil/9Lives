// app/api/reset/week/route.ts
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

// Columns that can be reset in week table
const WEEK_RESETTABLE_COLUMNS = [
  'coding_questions_attempted',
  'technical_questions_attempted', 
  'fundamental_questions_attempted',
  'tech_topics_covered',
  'aptitude_questions_attempted',
  'hr_questions_attempted',
  'ai_ml_covered',
  'system_design_covered',
  'java_lang_covered',
  'python_lang_covered',
  'sql_lang_covered'
] as const

export async function GET(request: NextRequest) {
  return handleResetWeekTable(request, 'GET');
}

export async function POST(request: NextRequest) {
  return handleResetWeekTable(request, 'POST');
}

async function handleResetWeekTable(request: NextRequest, method: 'GET' | 'POST') {
  try {
    console.log('=== RESET WEEK TABLE API DEBUG ===')
    console.log('Method:', method)

    // Validate API key
    const { searchParams } = new URL(request.url)
    const providedApiKey = searchParams.get('api_key')
    
    if (!providedApiKey || providedApiKey !== API_KEY) {
      return NextResponse.json(
        { 
          error: 'Invalid API key',
          details: 'Please provide a valid api_key parameter. This endpoint requires API key authentication for security.'
        },
        { status: 401 }
      )
    }

    console.log('Processing reset for WEEK TABLE - ALL USERS')

    // Get all current week records to show statistics before reset
    const { data: weekRecords, error: fetchError } = await supabaseAdmin
      .from('week')
      .select('*')

    if (fetchError) {
      console.error('Fetch week error:', fetchError)
      return NextResponse.json(
        { 
          error: 'Failed to fetch current week data',
          details: fetchError.message
        },
        { status: 400 }
      )
    }

    if (!weekRecords || weekRecords.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: 'No week records found to reset',
        reset_type: 'no_records',
        total_records_before: 0,
        records_reset: 0,
        statistics_before_reset: {},
        action: 'reset_week_table',
        timestamp: new Date().toISOString()
      })
    }

    // Calculate statistics before reset
    const totalRecords = weekRecords.length
    const statisticsBeforeReset: Record<string, { 
      records_with_data: number, 
      total_days_tracked: number,
      sample_values: string[] 
    }> = {}
    
    WEEK_RESETTABLE_COLUMNS.forEach(column => {
      const recordsWithData = weekRecords.filter(record => 
        record[column] && record[column].toString().trim() !== ''
      )
      
      const totalDays = recordsWithData.reduce((total, record) => {
        const values = record[column]?.toString().split(',') || []
        return total + values.length
      }, 0)

      const sampleValues = recordsWithData.slice(0, 3).map(record => 
        record[column]?.toString() || ''
      ).filter(val => val !== '')

      statisticsBeforeReset[column] = {
        records_with_data: recordsWithData.length,
        total_days_tracked: totalDays,
        sample_values: sampleValues
      }
    })

    // Prepare reset data - set all columns to empty strings
    const resetData: Record<string, string> = {}
    WEEK_RESETTABLE_COLUMNS.forEach(column => {
      resetData[column] = ''
    })

    console.log('Starting week table reset...')

    // Reset all week records to empty strings
    const { data: updatedRecords, error: updateError } = await supabaseAdmin
      .from('week')
      .update(resetData)
      .not('uid', 'is', null)
      .select('uid')

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { 
          error: 'Failed to reset week table',
          details: updateError.message,
          hint: 'Check database permissions and constraints'
        },
        { status: 400 }
      )
    }

    const recordsReset = updatedRecords?.length || 0

    console.log(`Week table reset successfully: ${recordsReset} records reset`)
    
    return NextResponse.json({ 
      success: true,
      message: 'Week table reset successfully - all historical data cleared',
      reset_type: 'full_week_table_reset',
      columns_reset: WEEK_RESETTABLE_COLUMNS,
      total_records_before: totalRecords,
      records_reset: recordsReset,
      statistics_before_reset: statisticsBeforeReset,
      action: 'reset_week_table',
      warning: 'All weekly historical data has been permanently cleared',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Unexpected error in reset week table route:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error occurred during week table reset'
      },
      { status: 500 }
    )
  }
}
// app/api/reset/today/route.ts
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

// Columns that can be reset (excluding 'contact' and 'uid')
const RESETTABLE_COLUMNS = [
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

type ResettableColumn = typeof RESETTABLE_COLUMNS[number]

export async function GET(request: NextRequest) {
  return handleResetAllUsers(request, 'GET');
}

export async function POST(request: NextRequest) {
  return handleResetAllUsers(request, 'POST');
}

async function handleResetAllUsers(request: NextRequest, method: 'GET' | 'POST') {
  try {
    console.log('=== RESET TODAY COUNTS FOR ALL USERS API DEBUG ===')
    console.log('Method:', method)

    // Validate API key - this is required for bulk operations
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

    // Check for optional column parameter to reset specific column for all users
    const specificColumn = searchParams.get('column') as ResettableColumn | null
    
    if (specificColumn && !RESETTABLE_COLUMNS.includes(specificColumn)) {
      return NextResponse.json(
        { 
          error: 'Invalid column name',
          details: `Column '${specificColumn}' is not allowed for reset`,
          resettable_columns: RESETTABLE_COLUMNS
        },
        { status: 400 }
      )
    }

    console.log('Processing reset for ALL USERS. Specific column:', specificColumn || 'all columns')

    // Get all current records to show statistics
    const { data: allRecords, error: fetchError } = await supabaseAdmin
      .from('today')
      .select('*')

    if (fetchError) {
      console.error('Fetch error:', fetchError)
      return NextResponse.json(
        { 
          error: 'Failed to fetch current data',
          details: fetchError.message
        },
        { status: 400 }
      )
    }

    if (!allRecords || allRecords.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: 'No records found to reset',
        reset_type: 'no_records',
        columns_reset: [],
        total_records_before: 0,
        records_updated: 0,
        statistics_before_reset: {},
        action: 'bulk_reset_all_users',
        timestamp: new Date().toISOString()
      })
    }

    // Prepare update data
    const updateData: Record<string, number> = {}
    const columnsToReset = specificColumn ? [specificColumn] : RESETTABLE_COLUMNS
    
    columnsToReset.forEach(column => {
      updateData[column] = 0
    })

    // Calculate statistics before reset
    const totalRecords = allRecords.length
    const statisticsBeforeReset: Record<string, { total: number, max: number, avg: number }> = {}
    
    columnsToReset.forEach(column => {
      const values = allRecords.map(record => Number(record[column]) || 0)
      statisticsBeforeReset[column] = {
        total: values.reduce((sum, val) => sum + val, 0),
        max: Math.max(...values),
        avg: Math.round((values.reduce((sum, val) => sum + val, 0) / values.length) * 100) / 100
      }
    })

    // FIXED: Reset all records without UUID comparison issues
    // Option 1: Update all records without any WHERE clause filter
    const { data: updatedRecords, error: updateError } = await supabaseAdmin
      .from('today')
      .update(updateData)
      .not('uid', 'is', null) // This ensures we only update records with valid UIDs
      .select('uid')

    // Alternative fix options (choose one):
    
    // Option 2: If you want to be more explicit, use a range query
    // const { data: updatedRecords, error: updateError } = await supabaseAdmin
    //   .from('today')
    //   .update(updateData)
    //   .gte('id', 0) // Assuming you have an auto-increment id column
    //   .select('uid')

    // Option 3: If you have a created_at timestamp column
    // const { data: updatedRecords, error: updateError } = await supabaseAdmin
    //   .from('today')
    //   .update(updateData)
    //   .not('created_at', 'is', null)
    //   .select('uid')

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { 
          error: 'Failed to reset counts for all users',
          details: updateError.message,
          hint: 'Check database column types and constraints'
        },
        { status: 400 }
      )
    }

    const recordsUpdated = updatedRecords?.length || 0

    console.log(`Counts reset successfully for ${recordsUpdated} users`)
    
    return NextResponse.json({ 
      success: true,
      message: specificColumn 
        ? `${specificColumn} reset to 0 for all users successfully`
        : 'All counts reset to 0 for all users successfully',
      reset_type: specificColumn ? 'single_column_all_users' : 'all_columns_all_users',
      columns_reset: columnsToReset,
      total_records_before: totalRecords,
      records_updated: recordsUpdated,
      statistics_before_reset: statisticsBeforeReset,
      action: 'bulk_reset_all_users',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Unexpected error in reset today counts route:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error occurred during reset operation'
      },
      { status: 500 }
    )
  }
}
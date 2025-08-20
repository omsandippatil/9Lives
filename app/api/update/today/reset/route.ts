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

    // Get all current records from 'today' table to show statistics and prepare for backup
    const { data: todayRecords, error: fetchTodayError } = await supabaseAdmin
      .from('today')
      .select('*')

    if (fetchTodayError) {
      console.error('Fetch today error:', fetchTodayError)
      return NextResponse.json(
        { 
          error: 'Failed to fetch current today data',
          details: fetchTodayError.message
        },
        { status: 400 }
      )
    }

    if (!todayRecords || todayRecords.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: 'No records found to reset',
        reset_type: 'no_records',
        columns_reset: [],
        total_records_before: 0,
        records_updated: 0,
        records_backed_up: 0,
        statistics_before_reset: {},
        action: 'bulk_reset_all_users',
        timestamp: new Date().toISOString()
      })
    }

    // Get all current records from 'week' table for backup operations
    const { data: weekRecords, error: fetchWeekError } = await supabaseAdmin
      .from('week')
      .select('*')

    if (fetchWeekError) {
      console.error('Fetch week error:', fetchWeekError)
      return NextResponse.json(
        { 
          error: 'Failed to fetch current week data',
          details: fetchWeekError.message
        },
        { status: 400 }
      )
    }

    // Create a map of week records by uid for quick lookup
    const weekRecordsMap = new Map()
    if (weekRecords) {
      weekRecords.forEach(record => {
        weekRecordsMap.set(record.uid, record)
      })
    }

    // Prepare columns to process
    const columnsToReset = specificColumn ? [specificColumn] : RESETTABLE_COLUMNS
    
    // Calculate statistics before reset
    const totalRecords = todayRecords.length
    const statisticsBeforeReset: Record<string, { total: number, max: number, avg: number }> = {}
    
    columnsToReset.forEach(column => {
      const values = todayRecords.map(record => Number(record[column]) || 0)
      statisticsBeforeReset[column] = {
        total: values.reduce((sum, val) => sum + val, 0),
        max: Math.max(...values),
        avg: Math.round((values.reduce((sum, val) => sum + val, 0) / values.length) * 100) / 100
      }
    })

    console.log('Starting backup process: Adding today values to week table...')
    
    // Step 1: Backup today's values to week table (append to existing arrays)
    let recordsBackedUp = 0
    const backupErrors: string[] = []
    
    for (const todayRecord of todayRecords) {
      const uid = todayRecord.uid
      const existingWeekRecord = weekRecordsMap.get(uid)
      
      // Prepare update data for week table
      const weekUpdateData: Record<string, string> = {}
      
      columnsToReset.forEach(column => {
        const todayValue = Number(todayRecord[column]) || 0
        const existingWeekValue = existingWeekRecord ? existingWeekRecord[column] : ''
        
        // Always append today's value (including zeros)
        if (existingWeekValue && typeof existingWeekValue === 'string' && existingWeekValue.trim() !== '') {
          // Append to existing comma-separated values
          weekUpdateData[column] = `${existingWeekValue},${todayValue}`
        } else {
          // First value for this column
          weekUpdateData[column] = todayValue.toString()
        }
      })
      
      try {
        if (existingWeekRecord) {
          // Update existing week record
          const { error: updateWeekError } = await supabaseAdmin
            .from('week')
            .update(weekUpdateData)
            .eq('uid', uid)
          
          if (updateWeekError) {
            backupErrors.push(`Failed to update week record for UID ${uid}: ${updateWeekError.message}`)
            continue
          }
        } else {
          // Create new week record if it doesn't exist
          const newWeekRecord: Record<string, any> = {
            uid: uid,
            ...weekUpdateData
          }
          
          // Initialize empty strings for columns not being updated
          columnsToReset.forEach(column => {
            if (!(column in weekUpdateData)) {
              newWeekRecord[column] = ''
            }
          })
          
          const { error: insertWeekError } = await supabaseAdmin
            .from('week')
            .insert(newWeekRecord)
          
          if (insertWeekError) {
            backupErrors.push(`Failed to create week record for UID ${uid}: ${insertWeekError.message}`)
            continue
          }
        }
        
        recordsBackedUp++
      } catch (error) {
        backupErrors.push(`Unexpected error backing up UID ${uid}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    console.log(`Backup completed: ${recordsBackedUp} records backed up to week table`)
    
    if (backupErrors.length > 0) {
      console.warn('Backup errors encountered:', backupErrors.slice(0, 5)) // Log first 5 errors
    }

    // Step 2: Reset today's values to zero
    console.log('Starting reset process: Resetting today values to zero...')
    
    const resetUpdateData: Record<string, number> = {}
    columnsToReset.forEach(column => {
      resetUpdateData[column] = 0
    })

    const { data: updatedRecords, error: updateError } = await supabaseAdmin
      .from('today')
      .update(resetUpdateData)
      .not('uid', 'is', null) // This ensures we only update records with valid UIDs
      .select('uid')

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { 
          error: 'Failed to reset counts for all users',
          details: updateError.message,
          hint: 'Check database column types and constraints',
          backup_status: {
            records_backed_up: recordsBackedUp,
            backup_errors_count: backupErrors.length
          }
        },
        { status: 400 }
      )
    }

    const recordsUpdated = updatedRecords?.length || 0

    console.log(`Reset completed successfully: ${recordsUpdated} users reset`)
    
    // Prepare base response
    const baseResponse = { 
      success: true,
      message: specificColumn 
        ? `${specificColumn} backed up to week table and reset to 0 for all users successfully`
        : 'All counts backed up to week table and reset to 0 for all users successfully',
      reset_type: specificColumn ? 'single_column_all_users' : 'all_columns_all_users',
      columns_processed: columnsToReset,
      total_records_before: totalRecords,
      records_updated: recordsUpdated,
      records_backed_up: recordsBackedUp,
      backup_errors_count: backupErrors.length,
      statistics_before_reset: statisticsBeforeReset,
      action: 'bulk_reset_all_users_with_backup',
      timestamp: new Date().toISOString()
    }

    // Include backup errors in response if there were any (but don't fail the request)
    const response = backupErrors.length > 0 
      ? {
          ...baseResponse,
          backup_errors_sample: backupErrors.slice(0, 3), // Include first 3 errors as sample
          backup_warning: `${backupErrors.length} records had backup errors but reset proceeded`
        }
      : baseResponse
    
    return NextResponse.json(response)

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
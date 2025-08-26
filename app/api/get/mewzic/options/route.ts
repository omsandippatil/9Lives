// app/api/music/details/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function GET(request: NextRequest) {
  try {
    console.log('=== MUSIC DETAILS API DEBUG ===')

    const { searchParams } = new URL(request.url)
    const details = searchParams.get('details')

    if (!details) {
      return NextResponse.json(
        { error: 'Missing details parameter. Use ?details=genre,vibe,language,singers,playlist' },
        { status: 400 }
      )
    }

    console.log('Fetching details for:', details)

    const requestedDetails = details.split(',').map(d => d.trim())
    const validDetails = ['genre', 'vibe', 'language', 'singers', 'playlist']
    
    // Validate requested details
    const invalidDetails = requestedDetails.filter(d => !validDetails.includes(d))
    if (invalidDetails.length > 0) {
      return NextResponse.json(
        { 
          error: `Invalid details requested: ${invalidDetails.join(', ')}`,
          valid_options: validDetails
        },
        { status: 400 }
      )
    }

    const result: any = {}

    // Fetch unique values for each requested detail
    for (const detail of requestedDetails) {
      console.log(`Fetching unique values for: ${detail}`)
      
      const { data, error } = await supabaseAdmin
        .from('mewzic')
        .select(detail)
        .not(detail, 'is', null)
        .not(detail, 'eq', '')

      if (error) {
        console.error(`Error fetching ${detail}:`, error)
        return NextResponse.json(
          { 
            error: `Failed to fetch ${detail}`,
            details: error.message
          },
          { status: 400 }
        )
      }

      // Extract unique values (handle comma-separated values)
      const uniqueValues = new Set<string>()
      
      data?.forEach((row: any) => {
        if (row[detail]) {
          // Split by comma and trim whitespace for multiple values
          const values = row[detail].split(',').map((v: string) => v.trim())
          values.forEach((value: string) => {
            if (value) uniqueValues.add(value)
          })
        }
      })

      result[detail] = Array.from(uniqueValues).sort()
    }

    console.log('Details fetched successfully:', Object.keys(result))

    return NextResponse.json({
      details: result,
      total_categories: Object.keys(result).length,
      debug: 'Music details fetched successfully'
    })

  } catch (error) {
    console.error('Unexpected error in music details route:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
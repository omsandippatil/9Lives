// app/api/python/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const srNo = searchParams.get('sr_no')
    const question = searchParams.get('question')

    // Search by sr_no - fetch from both tables
    if (srNo) {
      const srNoInt = parseInt(srNo)
      
      // Fetch from both python_code and python_coding_theory tables
      const [pythonCodeResult, pythonTheoryResult] = await Promise.all([
        supabase.from('python_code').select('*').eq('sr_no', srNoInt),
        supabase.from('python_coding_theory').select('*').eq('sr_no', srNoInt)
      ])

      if (pythonCodeResult.error) {
        console.error('Python Code Error:', pythonCodeResult.error)
        return NextResponse.json({ error: pythonCodeResult.error.message }, { status: 500 })
      }

      if (pythonTheoryResult.error) {
        console.error('Python Theory Error:', pythonTheoryResult.error)
        return NextResponse.json({ error: pythonTheoryResult.error.message }, { status: 500 })
      }

      const response = {
        success: true,
        sr_no: srNoInt,
        python_code: pythonCodeResult.data || [],
        python_coding_theory: pythonTheoryResult.data || [],
        found_in_code: pythonCodeResult.data && pythonCodeResult.data.length > 0,
        found_in_theory: pythonTheoryResult.data && pythonTheoryResult.data.length > 0,
        total_records: (pythonCodeResult.data?.length || 0) + (pythonTheoryResult.data?.length || 0)
      }

      return NextResponse.json(response)
    }

    // Search by question - search in both tables
    if (question) {
      const [pythonCodeResult, pythonTheoryResult] = await Promise.all([
        supabase.from('python_code').select('*').ilike('question', `%${question}%`),
        supabase.from('python_coding_theory').select('*').ilike('question', `%${question}%`)
      ])

      if (pythonCodeResult.error) {
        console.error('Python Code Error:', pythonCodeResult.error)
        return NextResponse.json({ error: pythonCodeResult.error.message }, { status: 500 })
      }

      if (pythonTheoryResult.error) {
        console.error('Python Theory Error:', pythonTheoryResult.error)
        return NextResponse.json({ error: pythonTheoryResult.error.message }, { status: 500 })
      }

      const response = {
        success: true,
        search_query: question,
        python_code: pythonCodeResult.data || [],
        python_coding_theory: pythonTheoryResult.data || [],
        code_count: pythonCodeResult.data?.length || 0,
        theory_count: pythonTheoryResult.data?.length || 0,
        total_records: (pythonCodeResult.data?.length || 0) + (pythonTheoryResult.data?.length || 0)
      }

      return NextResponse.json(response)
    }

    // If no parameters provided, return error
    return NextResponse.json(
      { error: 'Please provide either "sr_no" or "question" parameter' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Python API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Optional: Add POST method for creating new records
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { table, ...data } = body

    // Validate table parameter
    if (!['python_code', 'python_coding_theory'].includes(table)) {
      return NextResponse.json(
        { error: 'Invalid table. Must be either "python_code" or "python_coding_theory"' },
        { status: 400 }
      )
    }

    const { data: insertedData, error } = await supabase
      .from(table)
      .insert(data)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: insertedData[0],
      table: table
    }, { status: 201 })

  } catch (error) {
    console.error('Python API POST Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
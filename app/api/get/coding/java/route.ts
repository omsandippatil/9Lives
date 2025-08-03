// app/api/java/route.ts
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
      
      // Fetch from both java_code and java_coding_theory tables
      const [javaCodeResult, javaTheoryResult] = await Promise.all([
        supabase.from('java_code').select('*').eq('sr_no', srNoInt),
        supabase.from('java_coding_theory').select('*').eq('sr_no', srNoInt)
      ])

      if (javaCodeResult.error) {
        console.error('Java Code Error:', javaCodeResult.error)
        return NextResponse.json({ error: javaCodeResult.error.message }, { status: 500 })
      }

      if (javaTheoryResult.error) {
        console.error('Java Theory Error:', javaTheoryResult.error)
        return NextResponse.json({ error: javaTheoryResult.error.message }, { status: 500 })
      }

      const response = {
        success: true,
        sr_no: srNoInt,
        java_code: javaCodeResult.data || [],
        java_coding_theory: javaTheoryResult.data || [],
        found_in_code: javaCodeResult.data && javaCodeResult.data.length > 0,
        found_in_theory: javaTheoryResult.data && javaTheoryResult.data.length > 0,
        total_records: (javaCodeResult.data?.length || 0) + (javaTheoryResult.data?.length || 0)
      }

      return NextResponse.json(response)
    }

    // Search by question - search in both tables
    if (question) {
      const [javaCodeResult, javaTheoryResult] = await Promise.all([
        supabase.from('java_code').select('*').ilike('question', `%${question}%`),
        supabase.from('java_coding_theory').select('*').ilike('question', `%${question}%`)
      ])

      if (javaCodeResult.error) {
        console.error('Java Code Error:', javaCodeResult.error)
        return NextResponse.json({ error: javaCodeResult.error.message }, { status: 500 })
      }

      if (javaTheoryResult.error) {
        console.error('Java Theory Error:', javaTheoryResult.error)
        return NextResponse.json({ error: javaTheoryResult.error.message }, { status: 500 })
      }

      const response = {
        success: true,
        search_query: question,
        java_code: javaCodeResult.data || [],
        java_coding_theory: javaTheoryResult.data || [],
        code_count: javaCodeResult.data?.length || 0,
        theory_count: javaTheoryResult.data?.length || 0,
        total_records: (javaCodeResult.data?.length || 0) + (javaTheoryResult.data?.length || 0)
      }

      return NextResponse.json(response)
    }

    // If no parameters provided, return error
    return NextResponse.json(
      { error: 'Please provide either "sr_no" or "question" parameter' },
      { status: 400 }
    )

  } catch (error) {
    console.error('Java API Error:', error)
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
    if (!['java_code', 'java_coding_theory'].includes(table)) {
      return NextResponse.json(
        { error: 'Invalid table. Must be either "java_code" or "java_coding_theory"' },
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
    console.error('Java API POST Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
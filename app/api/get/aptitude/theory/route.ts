// app/api/aptitude/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const topicId = searchParams.get('topic_id')
    const topicName = searchParams.get('topic_name')

    if (topicId) {
      const topicIdInt = parseInt(topicId)
      
      if (isNaN(topicIdInt)) {
        return NextResponse.json(
          { error: 'Invalid topic_id. Must be a valid number' },
          { status: 400 }
        )
      }

      const { data, error } = await supabase
        .from('aptitude_theory')
        .select('*')
        .eq('id', topicIdInt)

      if (error) {
        console.error('Aptitude Theory Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      const response = {
        success: true,
        topic_id: topicIdInt,
        data: data || [],
        found: data && data.length > 0,
        total_records: data?.length || 0
      }

      return NextResponse.json(response)
    }

    // Search by topic_name (partial match)
    if (topicName) {
      const { data, error } = await supabase
        .from('aptitude_theory')
        .select('*')
        .ilike('topic_name', `%${topicName}%`)

      if (error) {
        console.error('Aptitude Theory Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      const response = {
        success: true,
        search_query: topicName,
        data: data || [],
        total_records: data?.length || 0
      }

      return NextResponse.json(response)
    }

    // If no parameters provided, return all topics (with optional pagination)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    const { data, error, count } = await supabase
      .from('aptitude_theory')
      .select('*', { count: 'exact' })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Aptitude Theory Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const response = {
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        total_records: count || 0,
        total_pages: Math.ceil((count || 0) / limit)
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Aptitude API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
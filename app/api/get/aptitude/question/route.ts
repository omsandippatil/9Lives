// app/api/aptitude-questions/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const questionId = searchParams.get('question_id')
    const topicName = searchParams.get('topic_name')
    const tags = searchParams.get('tags')

    // Search by question_id (id field)
    if (questionId) {
      const questionIdInt = parseInt(questionId)
      
      if (isNaN(questionIdInt)) {
        return NextResponse.json(
          { error: 'Invalid question_id. Must be a valid number' },
          { status: 400 }
        )
      }

      const { data, error } = await supabase
        .from('aptitude_questions')
        .select('*')
        .eq('id', questionIdInt)

      if (error) {
        console.error('Aptitude Questions Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      const response = {
        success: true,
        question_id: questionIdInt,
        data: data || [],
        found: data && data.length > 0,
        total_records: data?.length || 0
      }

      return NextResponse.json(response)
    }

    // Search by topic_name (partial match)
    if (topicName) {
      const { data, error } = await supabase
        .from('aptitude_questions')
        .select('*')
        .ilike('topic_name', `%${topicName}%`)

      if (error) {
        console.error('Aptitude Questions Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      const response = {
        success: true,
        search_query: topicName,
        search_type: 'topic_name',
        data: data || [],
        total_records: data?.length || 0
      }

      return NextResponse.json(response)
    }

    // Search by tags (contains any of the provided tags)
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim())
      
      const { data, error } = await supabase
        .from('aptitude_questions')
        .select('*')
        .overlaps('tags', tagArray)

      if (error) {
        console.error('Aptitude Questions Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      const response = {
        success: true,
        search_query: tagArray,
        search_type: 'tags',
        data: data || [],
        total_records: data?.length || 0
      }

      return NextResponse.json(response)
    }

    // If no specific parameters provided, return all questions (with optional pagination)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    // Optional filtering by difficulty or other criteria
    let query = supabase
      .from('aptitude_questions')
      .select('*', { count: 'exact' })

    // Apply ordering (newest first by default)
    query = query.order('id', { ascending: false })
    
    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Aptitude Questions Error:', error)
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
    console.error('Aptitude Questions API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
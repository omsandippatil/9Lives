// app/api/leaderboard/route.ts
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
    console.log('=== LEADERBOARD API DEBUG ===')

    // Get query parameters for pagination and filtering
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    console.log('Fetching leaderboard with limit:', limit, 'offset:', offset)

    // Fetch all users sorted by total_points in descending order
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        email,
        coding_questions_attempted,
        technical_questions_attempted,
        fundamental_questions_attempted,
        tech_topics_covered,
        current_streak,
        total_points,
        created_at,
        updated_at
      `)
      .order('total_points', { ascending: false })
      .range(offset, offset + limit - 1)

    console.log('Leaderboard query result:', { usersCount: users?.length, error: error?.message })

    if (error) {
      console.error('Leaderboard fetch error:', error)
      return NextResponse.json(
        { 
          error: 'Failed to fetch leaderboard',
          details: error.message,
          code: error.code
        },
        { status: 400 }
      )
    }

    // Get total count for pagination
    const { count, error: countError } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('Count fetch error:', countError)
    }

    // Transform the data to include enhanced statistics and rankings
    const leaderboardData = users?.map((user, index) => {
      const totalQuestions = (
        (user.coding_questions_attempted || 0) +
        (user.technical_questions_attempted || 0) +
        (user.fundamental_questions_attempted || 0)
      )

      return {
        id: user.id,
        email: user.email,
        rank: offset + index + 1,
        total_points: user.total_points || 0,
        current_streak: user.current_streak || 0,
        tech_topics_covered: user.tech_topics_covered || 0,
        total_questions_attempted: totalQuestions,
        categories: {
          coding: user.coding_questions_attempted || 0,
          technical: user.technical_questions_attempted || 0,
          fundamental: user.fundamental_questions_attempted || 0,
          aptitude: 0 // Not implemented yet
        },
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    }) || []

    // Calculate some stats for the response
    const stats = {
      total_users: count || 0,
      users_returned: leaderboardData.length,
      top_score: leaderboardData[0]?.total_points || 0,
      has_more: (offset + limit) < (count || 0)
    }

    return NextResponse.json({ 
      leaderboard: leaderboardData,
      stats,
      pagination: {
        limit,
        offset,
        total: count || 0,
        has_next: (offset + limit) < (count || 0),
        has_prev: offset > 0
      },
      debug: 'Leaderboard fetched successfully'
    })

  } catch (error) {
    console.error('Unexpected error in leaderboard route:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
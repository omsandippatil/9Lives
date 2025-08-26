// app/api/music/search/route.ts
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
    console.log('=== MUSIC SEARCH API DEBUG ===')

    const { searchParams } = new URL(request.url)
    const genre = searchParams.get('genre')
    const vibe = searchParams.get('vibe')
    const language = searchParams.get('language')
    const singers = searchParams.get('singers')
    const playlist = searchParams.get('playlist')
    const limit = parseInt(searchParams.get('limit') || '5')

    // Validate at least one search parameter
    if (!genre && !vibe && !language && !singers && !playlist) {
      return NextResponse.json(
        { 
          error: 'At least one search parameter is required',
          available_params: ['genre', 'vibe', 'language', 'singers', 'playlist', 'limit']
        },
        { status: 400 }
      )
    }

    // Validate limit
    if (limit < 1 || limit > 50) {
      return NextResponse.json(
        { error: 'Limit must be between 1 and 50' },
        { status: 400 }
      )
    }

    console.log('Searching songs with filters:', { genre, vibe, language, singers, playlist, limit })

    // Build the query
    let query = supabaseAdmin
      .from('mewzic')
      .select(`
        id,
        emoji,
        name,
        vibe,
        genre,
        language,
        singers,
        playlist,
        plays
      `)

    // Add filters (using ilike for case-insensitive partial matching)
    if (genre) {
      query = query.ilike('genre', `%${genre}%`)
    }
    if (vibe) {
      query = query.ilike('vibe', `%${vibe}%`)
    }
    if (language) {
      query = query.ilike('language', `%${language}%`)
    }
    if (singers) {
      query = query.ilike('singers', `%${singers}%`)
    }
    if (playlist) {
      query = query.ilike('playlist', `%${playlist}%`)
    }

    // Order by plays (most popular first) and limit results
    query = query.order('plays', { ascending: false }).limit(limit)

    const { data: songs, error } = await query

    if (error) {
      console.error('Songs search error:', error)
      return NextResponse.json(
        { 
          error: 'Failed to search songs',
          details: error.message
        },
        { status: 400 }
      )
    }

    console.log('Songs found:', songs?.length || 0)

    // Format the response (exclude links as requested)
    const searchResults = songs?.map(song => ({
      id: song.id,
      emoji: song.emoji,
      name: song.name,
      vibe: song.vibe,
      genre: song.genre,
      language: song.language,
      singers: song.singers,
      playlist: song.playlist,
      plays: song.plays
    })) || []

    // Build search criteria for response
    const searchCriteria: any = {}
    if (genre) searchCriteria.genre = genre
    if (vibe) searchCriteria.vibe = vibe
    if (language) searchCriteria.language = language
    if (singers) searchCriteria.singers = singers
    if (playlist) searchCriteria.playlist = playlist

    return NextResponse.json({
      songs: searchResults,
      search_criteria: searchCriteria,
      results_count: searchResults.length,
      limit_requested: limit,
      metadata: {
        searched_at: new Date().toISOString(),
        ordered_by: 'plays_desc'
      },
      debug: 'Songs search completed successfully'
    })

  } catch (error) {
    console.error('Unexpected error in music search route:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
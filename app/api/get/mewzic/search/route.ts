// app/api/get/mewzic/search/route.ts
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
    console.log('=== MEWZIC SEARCH API DEBUG ===')

    const { searchParams } = new URL(request.url)
    
    // Search parameters
    const query = searchParams.get('q') || searchParams.get('query') // General search query
    const name = searchParams.get('name')
    const vibe = searchParams.get('vibe')
    const genre = searchParams.get('genre')
    const language = searchParams.get('language')
    const singers = searchParams.get('singers')
    const playlist = searchParams.get('playlist')
    
    // Pagination and sorting
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)
    const sortBy = searchParams.get('sort') || 'plays' // plays, name, id
    const sortOrder = searchParams.get('order') === 'asc' ? 'asc' : 'desc'

    // Validate at least one search parameter
    if (!query && !name && !vibe && !genre && !language && !singers && !playlist) {
      return NextResponse.json(
        { 
          error: 'At least one search parameter is required',
          available_params: {
            search: ['q', 'query', 'name'],
            filters: ['vibe', 'genre', 'language', 'singers', 'playlist'],
            options: ['limit', 'offset', 'sort', 'order']
          },
          examples: [
            '/api/get/mewzic/search?q=love',
            '/api/get/mewzic/search?name=shape of you',
            '/api/get/mewzic/search?genre=pop&language=english',
            '/api/get/mewzic/search?singers=ed sheeran&limit=10'
          ]
        },
        { status: 400 }
      )
    }

    console.log('Search parameters:', { 
      query, name, vibe, genre, language, singers, playlist, 
      limit, offset, sortBy, sortOrder 
    })

    // Build the query
    let searchQuery = supabaseAdmin
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
      `, { count: 'exact' })

    // General search across multiple fields - Fixed the multiline string issue
    if (query) {
      const searchTerm = query.trim()
      searchQuery = searchQuery.or(
        `name.ilike.%${searchTerm}%,singers.ilike.%${searchTerm}%,playlist.ilike.%${searchTerm}%,vibe.ilike.%${searchTerm}%,genre.ilike.%${searchTerm}%,language.ilike.%${searchTerm}%`
      )
    }

    // Specific field searches
    if (name) {
      searchQuery = searchQuery.ilike('name', `%${name.trim()}%`)
    }
    if (vibe) {
      searchQuery = searchQuery.ilike('vibe', `%${vibe.trim()}%`)
    }
    if (genre) {
      searchQuery = searchQuery.ilike('genre', `%${genre.trim()}%`)
    }
    if (language) {
      searchQuery = searchQuery.ilike('language', `%${language.trim()}%`)
    }
    if (singers) {
      searchQuery = searchQuery.ilike('singers', `%${singers.trim()}%`)
    }
    if (playlist) {
      searchQuery = searchQuery.ilike('playlist', `%${playlist.trim()}%`)
    }

    // Apply sorting
    const validSortFields = ['plays', 'name', 'id', 'singers']
    const finalSortBy = validSortFields.includes(sortBy) ? sortBy : 'plays'
    searchQuery = searchQuery.order(finalSortBy, { ascending: sortOrder === 'asc' })

    // Apply pagination
    if (offset > 0) {
      searchQuery = searchQuery.range(offset, offset + limit - 1)
    } else {
      searchQuery = searchQuery.limit(limit)
    }

    const { data: songs, error, count } = await searchQuery

    if (error) {
      console.error('Search error:', error)
      return NextResponse.json(
        { 
          error: 'Failed to search songs',
          details: error.message,
          code: error.code || 'SEARCH_ERROR'
        },
        { status: 400 }
      )
    }

    console.log('Songs found:', songs?.length || 0, 'Total count:', count)

    // Format the response
    const searchResults = songs?.map(song => ({
      id: song.id,
      name: song.name,
      singers: song.singers,
      // Include additional fields for better search context
      emoji: song.emoji,
      vibe: song.vibe,
      genre: song.genre,
      language: song.language,
      playlist: song.playlist,
      plays: song.plays
    })) || []

    // Build search criteria for response
    const searchCriteria: Record<string, string> = {}
    if (query) searchCriteria.general_query = query
    if (name) searchCriteria.name = name
    if (vibe) searchCriteria.vibe = vibe
    if (genre) searchCriteria.genre = genre
    if (language) searchCriteria.language = language
    if (singers) searchCriteria.singers = singers
    if (playlist) searchCriteria.playlist = playlist

    // Calculate pagination info
    const totalCount = count || 0
    const hasMore = offset + limit < totalCount
    const currentPage = Math.floor(offset / limit) + 1
    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      songs: searchResults,
      search_criteria: searchCriteria,
      pagination: {
        current_page: currentPage,
        total_pages: totalPages,
        results_count: searchResults.length,
        total_results: totalCount,
        limit: limit,
        offset: offset,
        has_more: hasMore,
        next_offset: hasMore ? offset + limit : null
      },
      sorting: {
        sort_by: finalSortBy,
        sort_order: sortOrder
      },
      metadata: {
        searched_at: new Date().toISOString(),
        query_type: query ? 'general_search' : 'filtered_search'
      }
    })

  } catch (error) {
    console.error('Unexpected error in search route:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Optional: Add POST method for complex searches
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      query,
      filters = {},
      sort = { by: 'plays', order: 'desc' },
      pagination = { limit: 20, offset: 0 }
    } = body

    console.log('=== MEWZIC ADVANCED SEARCH API DEBUG ===')
    console.log('Search body:', { query, filters, sort, pagination })

    // Validate input
    if (!query && Object.keys(filters).length === 0) {
      return NextResponse.json(
        { 
          error: 'Either query or filters must be provided',
          example: {
            query: "love songs",
            filters: { genre: "pop", language: "english" },
            sort: { by: "plays", order: "desc" },
            pagination: { limit: 20, offset: 0 }
          }
        },
        { status: 400 }
      )
    }

    // Build the query
    let searchQuery = supabaseAdmin
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
      `, { count: 'exact' })

    // Apply general search - Fixed multiline string issue
    if (query) {
      const searchTerm = query.trim()
      searchQuery = searchQuery.or(
        `name.ilike.%${searchTerm}%,singers.ilike.%${searchTerm}%,playlist.ilike.%${searchTerm}%,vibe.ilike.%${searchTerm}%,genre.ilike.%${searchTerm}%`
      )
    }

    // Apply filters
    Object.entries(filters).forEach(([field, value]) => {
      if (typeof value === 'string' && value.trim()) {
        const validFields = ['name', 'vibe', 'genre', 'language', 'singers', 'playlist']
        if (validFields.includes(field)) {
          searchQuery = searchQuery.ilike(field, `%${value.trim()}%`)
        }
      }
    })

    // Apply sorting
    const sortBy = ['plays', 'name', 'id', 'singers'].includes(sort.by) ? sort.by : 'plays'
    const sortOrder = sort.order === 'asc' ? 'asc' : 'desc'
    searchQuery = searchQuery.order(sortBy, { ascending: sortOrder === 'asc' })

    // Apply pagination
    const limit = Math.min(Math.max(pagination.limit || 20, 1), 100)
    const offset = Math.max(pagination.offset || 0, 0)
    
    if (offset > 0) {
      searchQuery = searchQuery.range(offset, offset + limit - 1)
    } else {
      searchQuery = searchQuery.limit(limit)
    }

    const { data: songs, error, count } = await searchQuery

    if (error) {
      console.error('Advanced search error:', error)
      return NextResponse.json(
        { 
          error: 'Failed to perform advanced search',
          details: error.message,
          code: error.code || 'ADVANCED_SEARCH_ERROR'
        },
        { status: 400 }
      )
    }

    const searchResults = songs?.map(song => ({
      id: song.id,
      name: song.name,
      singers: song.singers,
      emoji: song.emoji,
      vibe: song.vibe,
      genre: song.genre,
      language: song.language,
      playlist: song.playlist,
      plays: song.plays
    })) || []

    const totalCount = count || 0
    const hasMore = offset + limit < totalCount

    return NextResponse.json({
      songs: searchResults,
      search_criteria: {
        query: query || null,
        filters,
        sort,
        pagination
      },
      pagination: {
        current_page: Math.floor(offset / limit) + 1,
        total_pages: Math.ceil(totalCount / limit),
        results_count: searchResults.length,
        total_results: totalCount,
        limit,
        offset,
        has_more: hasMore,
        next_offset: hasMore ? offset + limit : null
      },
      metadata: {
        searched_at: new Date().toISOString(),
        query_type: 'advanced_search'
      }
    })

  } catch (error) {
    console.error('Unexpected error in advanced search route:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
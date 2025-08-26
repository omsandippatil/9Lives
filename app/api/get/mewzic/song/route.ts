// app/api/music/song/route.ts
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

// Extract YouTube video ID from URL
function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
  return match ? match[1] : null
}

export async function GET(request: NextRequest) {
  try {
    console.log('Music API called')
    
    const { searchParams } = new URL(request.url)
    const songId = searchParams.get('id')

    console.log('Song ID:', songId)

    if (!songId) {
      return NextResponse.json({ error: 'Missing song ID' }, { status: 400 })
    }

    const id = parseInt(songId)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid song ID' }, { status: 400 })
    }

    console.log('Fetching song with ID:', id)

    // Check Supabase connection
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase credentials')
      return NextResponse.json({ error: 'Database configuration error' }, { status: 500 })
    }

    // Fetch song from database
    const { data: song, error } = await supabaseAdmin
      .from('mewzic')
      .select('id, emoji, name, vibe, genre, language, singers, playlist, youtube, plays')
      .eq('id', id)
      .single()

    console.log('Database response:', { song, error })

    if (error) {
      console.error('Database error:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Song not found' }, { status: 404 })
      }
      return NextResponse.json({ 
        error: 'Database error', 
        details: error.message 
      }, { status: 500 })
    }

    if (!song) {
      return NextResponse.json({ error: 'Song not found' }, { status: 404 })
    }

    if (!song.youtube) {
      return NextResponse.json({ error: 'No YouTube link available' }, { status: 404 })
    }

    // Extract YouTube ID
    const youtubeId = extractYouTubeId(song.youtube)
    console.log('YouTube ID extracted:', youtubeId)
    
    if (!youtubeId) {
      return NextResponse.json({ error: 'Invalid YouTube URL format' }, { status: 400 })
    }

    // Increment play count
    const { error: updateError } = await supabaseAdmin
      .from('mewzic')
      .update({ plays: (song.plays || 0) + 1 })
      .eq('id', id)

    if (updateError) {
      console.error('Error updating play count:', updateError)
    }

    const response = {
      success: true,
      id: song.id,
      emoji: song.emoji,
      name: song.name,
      vibe: song.vibe,
      genre: song.genre,
      language: song.language,
      singers: song.singers,
      playlist: song.playlist,
      youtube: {
        url: song.youtube,
        videoId: youtubeId,
        embedUrl: `https://www.youtube.com/embed/${youtubeId}?autoplay=1&controls=0`
      },
      plays: (song.plays || 0) + 1
    }

    console.log('Returning response:', response)
    return NextResponse.json(response)

  } catch (error) {
    console.error('Music API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
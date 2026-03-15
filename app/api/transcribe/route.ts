import { NextRequest, NextResponse } from 'next/server'
import { verifyRequestToken } from '@/lib/auth'
import { transcribeAudio, isWhisperAvailable } from '@/lib/whisper'
import { extractAudioFromVideo, isFfmpegAvailable } from '@/lib/ffmpeg'
import { extractAudioFromYouTube, isValidYouTubeUrl, isYtdlpAvailable } from '@/lib/youtube'
import { existsSync, unlinkSync } from 'fs'

const POSTGREST_URL = process.env.POSTGREST_URL || 'https://supabase.novalys.io'

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const user = verifyRequestToken(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { filePath, fileType, youtubeUrl, articleId } = await req.json()

    // Check dependencies
    const whisperAvailable = await isWhisperAvailable()
    if (!whisperAvailable) {
      return NextResponse.json(
        { error: 'Whisper not available on server' },
        { status: 500 }
      )
    }

    let audioPath = filePath
    let sourceUrl: string | null = null
    let contentType: 'podcast' | 'video' | 'youtube' = 'podcast'

    // Handle YouTube URL
    if (youtubeUrl) {
      if (!isValidYouTubeUrl(youtubeUrl)) {
        return NextResponse.json(
          { error: 'Invalid YouTube URL' },
          { status: 400 }
        )
      }

      const ytdlpAvailable = await isYtdlpAvailable()
      if (!ytdlpAvailable) {
        return NextResponse.json(
          { error: 'yt-dlp not available on server' },
          { status: 500 }
        )
      }

      console.log('[Transcribe] Extracting audio from YouTube...')
      const ytResult = await extractAudioFromYouTube(youtubeUrl)
      audioPath = ytResult.audioPath
      sourceUrl = youtubeUrl
      contentType = 'youtube'
    }
    // Handle video file
    else if (fileType === 'video') {
      const ffmpegAvailable = await isFfmpegAvailable()
      if (!ffmpegAvailable) {
        return NextResponse.json(
          { error: 'ffmpeg not available on server' },
          { status: 500 }
        )
      }

      if (!existsSync(filePath)) {
        return NextResponse.json(
          { error: 'Video file not found' },
          { status: 400 }
        )
      }

      console.log('[Transcribe] Extracting audio from video...')
      const ffResult = await extractAudioFromVideo(filePath)
      audioPath = ffResult.audioPath
      contentType = 'video'

      // Delete original video file
      try {
        unlinkSync(filePath)
      } catch {
        console.warn(`Could not delete video file: ${filePath}`)
      }
    }
    // Handle audio file
    else {
      if (!existsSync(filePath)) {
        return NextResponse.json(
          { error: 'Audio file not found' },
          { status: 400 }
        )
      }
      contentType = 'podcast'
    }

    // Transcribe audio
    console.log(`[Transcribe] Starting transcription: ${audioPath}`)
    const result = await transcribeAudio(audioPath)
    console.log(`[Transcribe] Complete. Language: ${result.language}`)

    // Clean up audio file
    try {
      unlinkSync(audioPath)
    } catch {
      console.warn(`Could not delete audio file: ${audioPath}`)
    }

    // Update article in database if articleId provided
    if (articleId) {
      const anonKey = process.env.POSTGREST_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneXZxbnBienF3bnVsd21jcmxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MjM2NjMsImV4cCI6MjA2NjE5OTY2M30.WLCWOlh2YpU3avjq_lSkLyf8hWW0yrWfIN9BkCpRIVw'

      await fetch(`${POSTGREST_URL}/rest/v1/sr_articles?id=eq.${articleId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${anonKey}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({
          audio_transcript: result.transcript,
          content_type: contentType,
          source_url: sourceUrl,
          processing_status: 'ready',
        }),
      })
    }

    return NextResponse.json({
      success: true,
      transcript: result.transcript,
      language: result.language,
      contentType,
      sourceUrl,
    })
  } catch (error) {
    console.error('Transcription error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Transcription failed',
      },
      { status: 500 }
    )
  }
}

// GET endpoint to check status
export async function GET(req: NextRequest) {
  const user = verifyRequestToken(req)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const whisperAvailable = await isWhisperAvailable()
  const ffmpegAvailable = await isFfmpegAvailable()
  const ytdlpAvailable = await isYtdlpAvailable()

  return NextResponse.json({
    whisper: whisperAvailable,
    ffmpeg: ffmpegAvailable,
    ytdlp: ytdlpAvailable,
    ready: whisperAvailable,
  })
}

import { NextRequest, NextResponse } from 'next/server'
import { verifyRequestToken } from '@/lib/auth'
import { isValidAudioFormat } from '@/lib/ffmpeg'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { v4 as uuidv4 } from 'uuid'
import * as path from 'path'

const UPLOAD_DIR = '/tmp/social-repurposer-uploads'
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const user = verifyRequestToken(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse multipart form data
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!isValidAudioFormat(file.name)) {
      return NextResponse.json(
        { error: 'Invalid file type. Supported: .mp3, .wav, .m4a, .ogg, .flac, .aac' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size: 50MB (~1 hour of audio)' },
        { status: 400 }
      )
    }

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true })
    }

    // Generate unique filename
    const uuid = uuidv4()
    const ext = path.extname(file.name)
    const filename = `${uuid}${ext}`
    const filePath = path.join(UPLOAD_DIR, filename)

    // Write file to disk
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    // Calculate estimated transcription time
    const estimatedSeconds = Math.ceil(file.size / (1024 * 1024) * 10)

    return NextResponse.json({
      success: true,
      fileId: uuid,
      filename: file.name,
      filePath,
      fileSize: file.size,
      estimatedTranscriptionTime: estimatedSeconds,
      status: 'uploaded',
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Upload failed',
      },
      { status: 500 }
    )
  }
}

// Route segment config for Next.js App Router
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

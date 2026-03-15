import { NextRequest, NextResponse } from 'next/server'
import { verifyRequestToken } from '@/lib/auth'
import { validateFileSize, validateVideoFormat, ErrorMessages } from '@/lib/errors'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { v4 as uuidv4 } from 'uuid'
import * as path from 'path'

const UPLOAD_DIR = '/tmp/social-repurposer-uploads'

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const user = verifyRequestToken(req)
    if (!user) {
      return NextResponse.json(
        { error: ErrorMessages.UNAUTHORIZED, code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    // Parse multipart form data
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided', code: 'NO_FILE' },
        { status: 400 }
      )
    }

    // Validate file type
    const formatCheck = validateVideoFormat(file.name)
    if (!formatCheck.valid) {
      return NextResponse.json(
        { error: formatCheck.error, code: 'INVALID_FORMAT' },
        { status: 400 }
      )
    }

    // Validate file size
    const sizeCheck = validateFileSize(file.size, 'video')
    if (!sizeCheck.valid) {
      return NextResponse.json(
        { error: sizeCheck.error, code: 'FILE_TOO_LARGE' },
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

    // Calculate estimated processing time (extraction + transcription)
    const estimatedSeconds = Math.ceil(file.size / (1024 * 1024) * 15)

    return NextResponse.json({
      success: true,
      fileId: uuid,
      filename: file.name,
      filePath,
      fileSize: file.size,
      estimatedProcessingTime: estimatedSeconds,
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

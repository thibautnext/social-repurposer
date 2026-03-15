import { spawn } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'

export interface AudioExtractionResult {
  audioPath: string
  duration: number
  format: string
}

/**
 * Find ffmpeg binary location
 */
async function findFfmpegBinary(): Promise<string | null> {
  const possiblePaths = [
    '/opt/homebrew/bin/ffmpeg',
    '/usr/local/bin/ffmpeg',
    '/usr/bin/ffmpeg',
  ]

  for (const binPath of possiblePaths) {
    if (fs.existsSync(binPath)) {
      return binPath
    }
  }

  // Try 'which' as fallback
  return new Promise((resolve) => {
    const proc = spawn('which', ['ffmpeg'])
    let output = ''
    proc.stdout.on('data', (data) => {
      output += data.toString()
    })
    proc.on('close', (code) => {
      if (code === 0 && output.trim()) {
        resolve(output.trim())
      } else {
        resolve(null)
      }
    })
  })
}

/**
 * Extract audio from video file
 * @param videoPath Path to video file (.mp4, .mov, .avi, .mkv)
 * @param outputFormat Output audio format (default: mp3)
 */
export async function extractAudioFromVideo(
  videoPath: string,
  outputFormat: string = 'mp3'
): Promise<AudioExtractionResult> {
  const ffmpegPath = await findFfmpegBinary()

  if (!ffmpegPath) {
    throw new Error('ffmpeg not found. Please install: brew install ffmpeg')
  }

  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video file not found: ${videoPath}`)
  }

  const outputDir = path.dirname(videoPath)
  const baseName = path.basename(videoPath, path.extname(videoPath))
  const audioPath = path.join(outputDir, `${baseName}.${outputFormat}`)

  return new Promise((resolve, reject) => {
    // ffmpeg -i input.mp4 -vn -ab 128k -ar 16000 output.mp3
    const args = [
      '-i', videoPath,
      '-vn',              // No video
      '-ab', '128k',      // Audio bitrate
      '-ar', '16000',     // Sample rate (16kHz is good for Whisper)
      '-y',               // Overwrite output
      audioPath,
    ]

    console.log(`[ffmpeg] Running: ${ffmpegPath} ${args.join(' ')}`)

    const proc = spawn(ffmpegPath, args)
    let stderr = ''
    let duration = 0

    proc.stderr.on('data', (data) => {
      const text = data.toString()
      stderr += text

      // Parse duration from stderr
      const durationMatch = text.match(/Duration: (\d{2}):(\d{2}):(\d{2})/)
      if (durationMatch) {
        const hours = parseInt(durationMatch[1])
        const minutes = parseInt(durationMatch[2])
        const seconds = parseInt(durationMatch[3])
        duration = hours * 3600 + minutes * 60 + seconds
      }
    })

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg failed with code ${code}: ${stderr}`))
        return
      }

      if (!fs.existsSync(audioPath)) {
        reject(new Error(`Audio extraction failed: output not found`))
        return
      }

      resolve({
        audioPath,
        duration,
        format: outputFormat,
      })
    })

    proc.on('error', (err) => {
      reject(new Error(`Failed to start ffmpeg: ${err.message}`))
    })
  })
}

/**
 * Get video duration in seconds
 */
export async function getVideoDuration(videoPath: string): Promise<number> {
  const ffmpegPath = await findFfmpegBinary()
  
  if (!ffmpegPath) {
    throw new Error('ffmpeg not found')
  }

  return new Promise((resolve) => {
    const ffprobePath = ffmpegPath.replace('ffmpeg', 'ffprobe')
    const args = [
      '-v', 'error',
      '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1',
      videoPath,
    ]

    const proc = spawn(ffprobePath, args)
    let output = ''

    proc.stdout.on('data', (data) => {
      output += data.toString()
    })

    proc.on('close', (code) => {
      if (code === 0 && output.trim()) {
        resolve(parseFloat(output.trim()))
      } else {
        resolve(0)
      }
    })

    proc.on('error', () => {
      resolve(0)
    })
  })
}

/**
 * Check if ffmpeg is available
 */
export async function isFfmpegAvailable(): Promise<boolean> {
  const ffmpegPath = await findFfmpegBinary()
  return ffmpegPath !== null
}

/**
 * Validate video file format
 */
export function isValidVideoFormat(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase()
  return ['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext)
}

/**
 * Validate audio file format
 */
export function isValidAudioFormat(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase()
  return ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac'].includes(ext)
}

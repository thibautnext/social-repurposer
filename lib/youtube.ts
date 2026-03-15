import { spawn } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

export interface YouTubeAudioResult {
  audioPath: string
  title: string
  duration: number
  channel: string
}

/**
 * Find yt-dlp binary location
 */
async function findYtdlpBinary(): Promise<string | null> {
  const possiblePaths = [
    '/opt/homebrew/bin/yt-dlp',
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp',
  ]

  for (const binPath of possiblePaths) {
    if (fs.existsSync(binPath)) {
      return binPath
    }
  }

  // Try 'which' as fallback
  return new Promise((resolve) => {
    const proc = spawn('which', ['yt-dlp'])
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
 * Validate YouTube URL
 */
export function isValidYouTubeUrl(url: string): boolean {
  const patterns = [
    /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
    /^https?:\/\/youtu\.be\/[\w-]+/,
    /^https?:\/\/(www\.)?youtube\.com\/shorts\/[\w-]+/,
  ]
  return patterns.some((pattern) => pattern.test(url))
}

/**
 * Extract audio from YouTube video
 * @param url YouTube video URL
 * @param outputDir Directory to save audio file
 */
export async function extractAudioFromYouTube(
  url: string,
  outputDir: string = '/tmp'
): Promise<YouTubeAudioResult> {
  const ytdlpPath = await findYtdlpBinary()

  if (!ytdlpPath) {
    throw new Error('yt-dlp not found. Please install: brew install yt-dlp')
  }

  if (!isValidYouTubeUrl(url)) {
    throw new Error('Invalid YouTube URL')
  }

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const uuid = uuidv4()
  const outputTemplate = path.join(outputDir, `${uuid}.%(ext)s`)

  return new Promise((resolve, reject) => {
    // First, get video info
    const infoArgs = [
      '--print', '%(title)s',
      '--print', '%(duration)s',
      '--print', '%(channel)s',
      url,
    ]

    let title = 'Unknown'
    let duration = 0
    let channel = 'Unknown'

    const infoProc = spawn(ytdlpPath, infoArgs)
    let infoOutput = ''

    infoProc.stdout.on('data', (data) => {
      infoOutput += data.toString()
    })

    infoProc.on('close', (infoCode) => {
      if (infoCode === 0) {
        const lines = infoOutput.trim().split('\n')
        title = lines[0] || 'Unknown'
        duration = parseInt(lines[1]) || 0
        channel = lines[2] || 'Unknown'
      }

      // Now download audio
      const downloadArgs = [
        '-x',                           // Extract audio
        '--audio-format', 'mp3',        // Convert to MP3
        '--audio-quality', '0',         // Best quality
        '-o', outputTemplate,           // Output template
        '--no-playlist',                // Single video only
        url,
      ]

      console.log(`[yt-dlp] Downloading: ${title}`)

      const downloadProc = spawn(ytdlpPath, downloadArgs)
      let stderr = ''

      downloadProc.stderr.on('data', (data) => {
        stderr += data.toString()
        console.log(`[yt-dlp] ${data.toString()}`)
      })

      downloadProc.stdout.on('data', (data) => {
        console.log(`[yt-dlp] ${data.toString()}`)
      })

      downloadProc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`yt-dlp failed with code ${code}: ${stderr}`))
          return
        }

        const audioPath = path.join(outputDir, `${uuid}.mp3`)

        if (!fs.existsSync(audioPath)) {
          reject(new Error(`Audio file not found after download`))
          return
        }

        resolve({
          audioPath,
          title,
          duration,
          channel,
        })
      })

      downloadProc.on('error', (err) => {
        reject(new Error(`Failed to start yt-dlp: ${err.message}`))
      })
    })

    infoProc.on('error', (err) => {
      reject(new Error(`Failed to get video info: ${err.message}`))
    })
  })
}

/**
 * Check if yt-dlp is available
 */
export async function isYtdlpAvailable(): Promise<boolean> {
  const ytdlpPath = await findYtdlpBinary()
  return ytdlpPath !== null
}

/**
 * Get YouTube video info without downloading
 */
export async function getYouTubeVideoInfo(url: string): Promise<{
  title: string
  duration: number
  channel: string
  thumbnail: string
}> {
  const ytdlpPath = await findYtdlpBinary()

  if (!ytdlpPath) {
    throw new Error('yt-dlp not found')
  }

  if (!isValidYouTubeUrl(url)) {
    throw new Error('Invalid YouTube URL')
  }

  return new Promise((resolve, reject) => {
    const args = [
      '--print', '%(title)s',
      '--print', '%(duration)s',
      '--print', '%(channel)s',
      '--print', '%(thumbnail)s',
      url,
    ]

    const proc = spawn(ytdlpPath, args)
    let output = ''

    proc.stdout.on('data', (data) => {
      output += data.toString()
    })

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Failed to get video info`))
        return
      }

      const lines = output.trim().split('\n')
      resolve({
        title: lines[0] || 'Unknown',
        duration: parseInt(lines[1]) || 0,
        channel: lines[2] || 'Unknown',
        thumbnail: lines[3] || '',
      })
    })

    proc.on('error', (err) => {
      reject(new Error(`Failed to start yt-dlp: ${err.message}`))
    })
  })
}

import { spawn } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'

export interface TranscriptionResult {
  transcript: string
  language: string
  duration: number
  model: string
}

/**
 * Find Whisper binary location
 */
async function findWhisperBinary(): Promise<string | null> {
  const possiblePaths = [
    '/opt/homebrew/bin/whisper',
    '/usr/local/bin/whisper',
    '/usr/bin/whisper',
  ]

  for (const binPath of possiblePaths) {
    if (fs.existsSync(binPath)) {
      return binPath
    }
  }

  // Try 'which' as fallback
  return new Promise((resolve) => {
    const proc = spawn('which', ['whisper'])
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
 * Transcribe audio file using local Whisper
 * @param filePath Path to audio file (.mp3, .wav, .m4a, .ogg)
 * @param language Optional language code (auto-detect if not provided)
 */
export async function transcribeAudio(
  filePath: string,
  language?: string
): Promise<TranscriptionResult> {
  const whisperPath = await findWhisperBinary()

  if (!whisperPath) {
    throw new Error(
      'Whisper not found. Please install: brew install openai-whisper'
    )
  }

  if (!fs.existsSync(filePath)) {
    throw new Error(`Audio file not found: ${filePath}`)
  }

  const outputDir = path.dirname(filePath)
  const baseName = path.basename(filePath, path.extname(filePath))
  const outputFile = path.join(outputDir, `${baseName}.txt`)

  return new Promise((resolve, reject) => {
    const args = [
      filePath,
      '--model', 'turbo',
      '--output_format', 'txt',
      '--output_dir', outputDir,
    ]

    if (language) {
      args.push('--language', language)
    }

    console.log(`[Whisper] Running: ${whisperPath} ${args.join(' ')}`)

    const proc = spawn(whisperPath, args)
    let stderr = ''
    let detectedLanguage = 'auto'

    proc.stderr.on('data', (data) => {
      const text = data.toString()
      stderr += text
      console.log(`[Whisper] ${text}`)

      // Parse language detection from stderr
      const langMatch = text.match(/Detected language: (\w+)/)
      if (langMatch) {
        detectedLanguage = langMatch[1]
      }
    })

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Whisper failed with code ${code}: ${stderr}`))
        return
      }

      // Read transcript from output file
      if (!fs.existsSync(outputFile)) {
        reject(new Error(`Transcript file not found: ${outputFile}`))
        return
      }

      const transcript = fs.readFileSync(outputFile, 'utf-8').trim()

      // Clean up transcript file
      try {
        fs.unlinkSync(outputFile)
      } catch {
        console.warn(`[Whisper] Could not delete ${outputFile}`)
      }

      resolve({
        transcript,
        language: language || detectedLanguage,
        duration: 0, // TODO: Parse from Whisper output
        model: 'turbo',
      })
    })

    proc.on('error', (err) => {
      reject(new Error(`Failed to start Whisper: ${err.message}`))
    })
  })
}

/**
 * Check if Whisper is available
 */
export async function isWhisperAvailable(): Promise<boolean> {
  const whisperPath = await findWhisperBinary()
  return whisperPath !== null
}

/**
 * Get estimated transcription time
 * @param fileSizeBytes File size in bytes
 * @returns Estimated time in seconds
 */
export function estimateTranscriptionTime(fileSizeBytes: number): number {
  // Rough estimate: ~1 minute of audio = 1MB = ~10 seconds processing with turbo model
  const fileSizeMB = fileSizeBytes / (1024 * 1024)
  return Math.ceil(fileSizeMB * 10)
}

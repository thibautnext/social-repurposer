/**
 * Custom error types and user-friendly error messages
 */

export class AppError extends Error {
  statusCode: number
  userMessage: string

  constructor(message: string, statusCode: number = 500, userMessage?: string) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.userMessage = userMessage || message
  }
}

export const ErrorMessages = {
  // File upload errors
  FILE_TOO_LARGE: 'File too large. Maximum size: 50MB for audio, 100MB for video',
  UNSUPPORTED_AUDIO_FORMAT: 'Audio format not supported. Try: MP3, WAV, M4A, OGG, FLAC, AAC',
  UNSUPPORTED_VIDEO_FORMAT: 'Video format not supported. Try: MP4, MOV, AVI, MKV, WebM',
  
  // Transcription errors
  TRANSCRIPTION_TIMEOUT: 'Transcription is taking longer than expected. Please try with a shorter file.',
  TRANSCRIPTION_FAILED: 'Failed to transcribe audio. Please try again or check audio quality.',
  WHISPER_UNAVAILABLE: 'Transcription service temporarily unavailable. Please try again later.',
  
  // YouTube errors
  YOUTUBE_INVALID_URL: 'Invalid YouTube URL. Please use a valid youtube.com or youtu.be link.',
  YOUTUBE_UNAVAILABLE: 'This YouTube video is private, unavailable, or age-restricted.',
  YOUTUBE_DOWNLOAD_FAILED: 'Failed to download YouTube audio. Video may be restricted.',
  
  // Content errors
  CONTENT_TOO_SHORT: 'Content is too short for meaningful repurposing. Minimum 100 characters.',
  CONTENT_TOO_LONG: 'Content exceeds maximum length. Please use a shorter article or transcript.',
  
  // Generation errors
  VARIANT_GENERATION_FAILED: 'Failed to generate some content variants. Please try again.',
  AI_SERVICE_UNAVAILABLE: 'AI service temporarily unavailable. Please try again in a few minutes.',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded. Please wait a moment before trying again.',
  
  // Auth errors
  UNAUTHORIZED: 'Please log in to continue.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  
  // Network errors
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  SERVER_ERROR: 'Something went wrong. Our team has been notified.',
} as const

export type ErrorCode = keyof typeof ErrorMessages

/**
 * Create a user-friendly error response
 */
export function createErrorResponse(code: ErrorCode, details?: string) {
  const message = ErrorMessages[code]
  return {
    error: message,
    code,
    details: details || null,
  }
}

/**
 * Validate file size
 */
export function validateFileSize(
  sizeBytes: number,
  type: 'audio' | 'video'
): { valid: boolean; error?: string } {
  const maxSizeAudio = 50 * 1024 * 1024 // 50MB
  const maxSizeVideo = 100 * 1024 * 1024 // 100MB
  const maxSize = type === 'audio' ? maxSizeAudio : maxSizeVideo

  if (sizeBytes > maxSize) {
    return {
      valid: false,
      error: `File too large (${Math.round(sizeBytes / 1024 / 1024)}MB). Maximum: ${maxSize / 1024 / 1024}MB`,
    }
  }

  return { valid: true }
}

/**
 * Validate audio file format
 */
export function validateAudioFormat(filename: string): { valid: boolean; error?: string } {
  const validExtensions = ['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac', '.webm']
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'))

  if (!validExtensions.includes(ext)) {
    return {
      valid: false,
      error: ErrorMessages.UNSUPPORTED_AUDIO_FORMAT,
    }
  }

  return { valid: true }
}

/**
 * Validate video file format
 */
export function validateVideoFormat(filename: string): { valid: boolean; error?: string } {
  const validExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v']
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'))

  if (!validExtensions.includes(ext)) {
    return {
      valid: false,
      error: ErrorMessages.UNSUPPORTED_VIDEO_FORMAT,
    }
  }

  return { valid: true }
}

/**
 * Parse error from catch block into user-friendly message
 */
export function parseError(error: unknown): { message: string; code: string } {
  if (error instanceof AppError) {
    return { message: error.userMessage, code: error.name }
  }

  if (error instanceof Error) {
    // Check for known error patterns
    if (error.message.includes('ETIMEDOUT') || error.message.includes('timeout')) {
      return { message: ErrorMessages.NETWORK_ERROR, code: 'TIMEOUT' }
    }
    if (error.message.includes('rate') && error.message.includes('limit')) {
      return { message: ErrorMessages.RATE_LIMIT_EXCEEDED, code: 'RATE_LIMIT' }
    }
    if (error.message.includes('unauthorized') || error.message.includes('401')) {
      return { message: ErrorMessages.UNAUTHORIZED, code: 'AUTH_ERROR' }
    }
    
    // Return original message for debugging, but cap length
    return {
      message: error.message.length > 200 
        ? error.message.substring(0, 200) + '...' 
        : error.message,
      code: 'UNKNOWN_ERROR',
    }
  }

  return { message: ErrorMessages.SERVER_ERROR, code: 'UNKNOWN_ERROR' }
}

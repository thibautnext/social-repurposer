'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type ContentType = 'blog' | 'podcast' | 'youtube' | 'video'
type TabType = 'url' | 'audio' | 'video' | 'youtube'
type ToastType = 'success' | 'error' | 'info'

interface Variants {
  twitter: string[]
  linkedin: string
  tiktok: string
  instagram: string[]
  facebook: string
  email: string
  podcastDescription?: string
  youtubeShorts?: string
  linkedinCarousel?: string[]
  newsletterPreview?: string
}

interface Toast {
  id: number
  message: string
  type: ToastType
}

// Toast notification component
function ToastNotification({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: number) => void }) {
  return (
    <div className="fixed bottom-4 right-4 space-y-2 z-50">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-3 rounded-lg shadow-lg text-white flex items-center justify-between min-w-[280px] transform transition-all duration-300 ${
            toast.type === 'success' ? 'bg-green-500' :
            toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
          }`}
        >
          <span className="flex items-center gap-2">
            {toast.type === 'success' && '✓'}
            {toast.type === 'error' && '✗'}
            {toast.type === 'info' && 'ℹ'}
            {toast.message}
          </span>
          <button
            onClick={() => removeToast(toast.id)}
            className="ml-4 hover:opacity-70"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

// Loading spinner component
function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }
  return (
    <div className={`${sizes[size]} animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600`} />
  )
}

export default function Dashboard() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('url')
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [processingStatus, setProcessingStatus] = useState('')
  const [processingStep, setProcessingStep] = useState(0)
  const [variants, setVariants] = useState<Variants | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [contentType, setContentType] = useState<ContentType>('blog')
  const [variantCount, setVariantCount] = useState(0)
  const [toasts, setToasts] = useState<Toast[]>([])
  const audioInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const toastIdRef = useRef(0)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/auth/login')
    }
  }, [router])

  // Toast management
  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = toastIdRef.current++
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => removeToast(id), 4000)
  }, [])

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }

  // Processing steps for progress display
  const processingSteps = [
    { label: 'Uploading file...', icon: '📤' },
    { label: 'Extracting audio...', icon: '🎵' },
    { label: 'Transcribing...', icon: '📝' },
    { label: 'Generating variants...', icon: '✨' },
    { label: 'Complete!', icon: '🎉' },
  ]

  const handleFileUpload = async (file: File, type: 'audio' | 'video') => {
    setLoading(true)
    setError('')
    setVariants(null)
    setUploadProgress(0)
    setProcessingStep(0)
    setProcessingStatus(processingSteps[0].label)

    try {
      const token = localStorage.getItem('token')
      const formData = new FormData()
      formData.append('file', file)

      // Validate file size client-side
      const maxSize = type === 'audio' ? 50 * 1024 * 1024 : 100 * 1024 * 1024
      if (file.size > maxSize) {
        throw new Error(`File too large. Maximum: ${maxSize / 1024 / 1024}MB`)
      }

      // Upload file
      const uploadUrl = type === 'audio' ? '/api/upload-audio' : '/api/upload-video'
      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      if (!uploadRes.ok) {
        const err = await uploadRes.json()
        throw new Error(err.error || 'Upload failed')
      }

      const uploadData = await uploadRes.json()
      setUploadProgress(25)
      setProcessingStep(type === 'video' ? 1 : 2)
      setProcessingStatus(type === 'video' ? processingSteps[1].label : processingSteps[2].label)

      // Transcribe
      const transcribeRes = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          filePath: uploadData.filePath,
          fileType: type,
        }),
      })

      if (!transcribeRes.ok) {
        const err = await transcribeRes.json()
        throw new Error(err.error || 'Transcription failed')
      }

      const transcribeData = await transcribeRes.json()
      setUploadProgress(60)
      setProcessingStep(3)
      setProcessingStatus(processingSteps[3].label)

      // Repurpose
      const repurposeRes = await fetch('/api/repurpose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          transcript: transcribeData.transcript,
          contentType: type === 'video' ? 'video' : 'podcast',
        }),
      })

      if (!repurposeRes.ok) {
        throw new Error('Failed to generate variants')
      }

      const data = await repurposeRes.json()
      setVariants(data.variants)
      setContentType(data.contentType)
      setVariantCount(data.variantCount)
      setUploadProgress(100)
      setProcessingStep(4)
      setProcessingStatus(processingSteps[4].label)
      addToast(`Generated ${data.variantCount} content variants!`, 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      addToast(message, 'error')
    } finally {
      setLoading(false)
      setTimeout(() => setProcessingStatus(''), 2000)
    }
  }

  const handleYouTubeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!youtubeUrl) return

    setLoading(true)
    setError('')
    setVariants(null)
    setProcessingStep(0)
    setProcessingStatus('Downloading YouTube audio...')

    try {
      const token = localStorage.getItem('token')

      // Transcribe YouTube
      setUploadProgress(20)
      const transcribeRes = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ youtubeUrl }),
      })

      if (!transcribeRes.ok) {
        const err = await transcribeRes.json()
        throw new Error(err.error || 'YouTube extraction failed')
      }

      const transcribeData = await transcribeRes.json()
      setUploadProgress(60)
      setProcessingStatus('Generating variants...')

      // Repurpose
      const repurposeRes = await fetch('/api/repurpose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          transcript: transcribeData.transcript,
          contentType: 'youtube',
        }),
      })

      if (!repurposeRes.ok) {
        throw new Error('Failed to generate variants')
      }

      const data = await repurposeRes.json()
      setVariants(data.variants)
      setContentType(data.contentType)
      setVariantCount(data.variantCount)
      setUploadProgress(100)
      setYoutubeUrl('')
      addToast(`Generated ${data.variantCount} content variants!`, 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      addToast(message, 'error')
    } finally {
      setLoading(false)
      setProcessingStatus('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setVariants(null)
    setProcessingStatus('Analyzing content...')

    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/repurpose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: url || null, text: text || null }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to repurpose article')
      }

      const data = await res.json()
      setVariants(data.variants)
      setContentType(data.contentType)
      setVariantCount(data.variantCount || 6)
      setUrl('')
      setText('')
      addToast(`Generated ${data.variantCount || 6} content variants!`, 'success')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      addToast(message, 'error')
    } finally {
      setLoading(false)
      setProcessingStatus('')
    }
  }

  const copyToClipboard = (text: string, source: string) => {
    navigator.clipboard.writeText(text)
    setCopied(source)
    addToast('Copied to clipboard!', 'success')
    setTimeout(() => setCopied(null), 2000)
  }

  const copyAll = () => {
    if (!variants) return
    const all = [
      '=== TWITTER THREAD ===',
      variants.twitter.join('\n\n'),
      '\n=== LINKEDIN ===',
      variants.linkedin,
      '\n=== TIKTOK SCRIPT ===',
      variants.tiktok,
      '\n=== INSTAGRAM CAPTIONS ===',
      variants.instagram.join('\n---\n'),
      '\n=== FACEBOOK ===',
      variants.facebook,
      '\n=== EMAIL NEWSLETTER ===',
      variants.email,
      variants.podcastDescription ? '\n=== PODCAST DESCRIPTION ===\n' + variants.podcastDescription : '',
      variants.youtubeShorts ? '\n=== YOUTUBE SHORTS ===\n' + variants.youtubeShorts : '',
      variants.linkedinCarousel ? '\n=== LINKEDIN CAROUSEL ===\n' + variants.linkedinCarousel.join('\n---\n') : '',
      variants.newsletterPreview ? '\n=== NEWSLETTER PREVIEW ===\n' + variants.newsletterPreview : '',
    ].filter(Boolean).join('\n')
    navigator.clipboard.writeText(all)
    addToast('All variants copied!', 'success')
  }

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'url', label: 'Blog URL', icon: '🔗' },
    { id: 'audio', label: 'Podcast', icon: '🎙️' },
    { id: 'video', label: 'Video', icon: '🎬' },
    { id: 'youtube', label: 'YouTube', icon: '📺' },
  ]

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Toast notifications */}
      <ToastNotification toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <nav className="border-b border-gray-200 bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-indigo-600">
            Content Repurposer
          </Link>
          <button
            onClick={() => {
              localStorage.removeItem('token')
              router.push('/')
            }}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Input Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-2xl font-bold mb-6">Transform Your Content</h2>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 font-medium text-sm rounded-lg transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-indigo-100 text-indigo-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* URL/Text Tab */}
          {activeTab === 'url' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Article URL
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/article"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                <p className="text-sm text-gray-500 mt-1">OR paste text below</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Article Text
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste your article text here..."
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading || (!url && !text)}
                className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Spinner size="sm" />
                    Processing...
                  </>
                ) : (
                  'Transform Article →'
                )}
              </button>
            </form>
          )}

          {/* Audio Upload Tab */}
          {activeTab === 'audio' && (
            <div className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                  loading
                    ? 'border-indigo-300 bg-indigo-50'
                    : 'border-gray-300 hover:border-indigo-500 hover:bg-indigo-50/50'
                }`}
                onClick={() => !loading && audioInputRef.current?.click()}
              >
                <input
                  ref={audioInputRef}
                  type="file"
                  accept=".mp3,.wav,.m4a,.ogg,.flac,.aac"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileUpload(file, 'audio')
                  }}
                />
                {loading ? (
                  <div className="space-y-4">
                    <Spinner size="lg" />
                    <p className="text-lg font-medium text-indigo-700">{processingStatus}</p>
                  </div>
                ) : (
                  <>
                    <div className="text-5xl mb-4">🎙️</div>
                    <p className="text-lg font-medium text-gray-700">
                      Drop your podcast here
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Supports: MP3, WAV, M4A, OGG, FLAC • Max 50MB (~1 hour)
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Video Upload Tab */}
          {activeTab === 'video' && (
            <div className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                  loading
                    ? 'border-indigo-300 bg-indigo-50'
                    : 'border-gray-300 hover:border-indigo-500 hover:bg-indigo-50/50'
                }`}
                onClick={() => !loading && videoInputRef.current?.click()}
              >
                <input
                  ref={videoInputRef}
                  type="file"
                  accept=".mp4,.mov,.avi,.mkv,.webm"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileUpload(file, 'video')
                  }}
                />
                {loading ? (
                  <div className="space-y-4">
                    <Spinner size="lg" />
                    <p className="text-lg font-medium text-indigo-700">{processingStatus}</p>
                  </div>
                ) : (
                  <>
                    <div className="text-5xl mb-4">🎬</div>
                    <p className="text-lg font-medium text-gray-700">
                      Drop your video here
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Supports: MP4, MOV, AVI, MKV, WebM • Max 100MB
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* YouTube Tab */}
          {activeTab === 'youtube' && (
            <form onSubmit={handleYouTubeSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  YouTube URL
                </label>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Also supports: youtube.com/shorts/... and youtu.be/...
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !youtubeUrl}
                className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Spinner size="sm" />
                    {processingStatus || 'Processing...'}
                  </>
                ) : (
                  'Transform YouTube Video →'
                )}
              </button>
            </form>
          )}

          {/* Progress indicator */}
          {loading && uploadProgress > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{processingSteps[processingStep]?.icon || '⏳'}</span>
                  <span className="text-sm font-medium text-gray-700">{processingStatus}</span>
                </div>
                <span className="text-sm font-bold text-indigo-600">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm mt-4 flex items-start gap-2">
              <span className="text-red-500 mt-0.5">⚠️</span>
              <div>
                <p className="font-medium">Error</p>
                <p>{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Results Section */}
        {variants && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h2 className="text-2xl font-bold">Your Content Variants</h2>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                  {contentType.charAt(0).toUpperCase() + contentType.slice(1)}
                </span>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  {variantCount} variants
                </span>
                <button
                  onClick={copyAll}
                  className="px-4 py-1.5 bg-gray-900 text-white rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
                >
                  Copy All
                </button>
              </div>
            </div>

            {/* Variant Cards */}
            <div className="grid gap-6">
              {/* Twitter */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-blue-400 flex items-center gap-2">
                    <span>🐦</span> Twitter Thread
                  </h3>
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">{variants.twitter.length} tweets</span>
                </div>
                <div className="space-y-3">
                  {variants.twitter.map((tweet, i) => (
                    <div key={i} className="bg-gray-50 p-4 rounded-lg border border-gray-100 hover:border-blue-200 transition-colors">
                      <div className="flex justify-between items-start gap-4">
                        <p className="text-gray-700 text-sm flex-1">{tweet}</p>
                        <button
                          onClick={() => copyToClipboard(tweet, `twitter-${i}`)}
                          className="text-indigo-600 hover:text-indigo-700 text-sm whitespace-nowrap font-medium"
                        >
                          {copied === `twitter-${i}` ? '✓' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* LinkedIn */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-blue-700 flex items-center gap-2">
                    <span>💼</span> LinkedIn Post
                  </h3>
                  <button
                    onClick={() => copyToClipboard(variants.linkedin, 'linkedin')}
                    className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                  >
                    {copied === 'linkedin' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">{variants.linkedin}</p>
              </div>

              {/* TikTok */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-black flex items-center gap-2">
                    <span>🎵</span> TikTok Script
                  </h3>
                  <button
                    onClick={() => copyToClipboard(variants.tiktok, 'tiktok')}
                    className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                  >
                    {copied === 'tiktok' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">{variants.tiktok}</p>
              </div>

              {/* Instagram */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-pink-600 flex items-center gap-2">
                    <span>📸</span> Instagram Captions
                  </h3>
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">{variants.instagram.length} variants</span>
                </div>
                <div className="space-y-3">
                  {variants.instagram.map((caption, i) => (
                    <div key={i} className="bg-gray-50 p-4 rounded-lg border border-gray-100 hover:border-pink-200 transition-colors">
                      <div className="flex justify-between items-start gap-4">
                        <p className="text-gray-700 text-sm flex-1">{caption}</p>
                        <button
                          onClick={() => copyToClipboard(caption, `instagram-${i}`)}
                          className="text-indigo-600 hover:text-indigo-700 text-sm whitespace-nowrap font-medium"
                        >
                          {copied === `instagram-${i}` ? '✓' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Facebook */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-blue-600 flex items-center gap-2">
                    <span>👍</span> Facebook Post
                  </h3>
                  <button
                    onClick={() => copyToClipboard(variants.facebook, 'facebook')}
                    className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                  >
                    {copied === 'facebook' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">{variants.facebook}</p>
              </div>

              {/* Email */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <span>✉️</span> Email Newsletter
                  </h3>
                  <button
                    onClick={() => copyToClipboard(variants.email, 'email')}
                    className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                  >
                    {copied === 'email' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-gray-700 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">{variants.email}</p>
              </div>

              {/* NEW VARIANTS FOR PODCAST/VIDEO */}
              {variants.podcastDescription && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-purple-600 flex items-center gap-2">
                      <span>🎙️</span> Podcast Description
                    </h3>
                    <button
                      onClick={() => copyToClipboard(variants.podcastDescription!, 'podcast-desc')}
                      className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                    >
                      {copied === 'podcast-desc' ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                    {variants.podcastDescription}
                  </p>
                </div>
              )}

              {variants.youtubeShorts && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-red-600 flex items-center gap-2">
                      <span>📺</span> YouTube Shorts Script
                    </h3>
                    <button
                      onClick={() => copyToClipboard(variants.youtubeShorts!, 'yt-shorts')}
                      className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                    >
                      {copied === 'yt-shorts' ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                    {variants.youtubeShorts}
                  </p>
                </div>
              )}

              {variants.linkedinCarousel && variants.linkedinCarousel.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-blue-700 flex items-center gap-2">
                      <span>📑</span> LinkedIn Carousel
                    </h3>
                    <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">{variants.linkedinCarousel.length} slides</span>
                  </div>
                  <div className="space-y-3">
                    {variants.linkedinCarousel.map((slide, i) => (
                      <div key={i} className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-100">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex items-start gap-3">
                            <span className="bg-blue-600 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">{i + 1}</span>
                            <p className="text-gray-700 text-sm flex-1">{slide}</p>
                          </div>
                          <button
                            onClick={() => copyToClipboard(slide, `carousel-${i}`)}
                            className="text-indigo-600 hover:text-indigo-700 text-sm whitespace-nowrap font-medium"
                          >
                            {copied === `carousel-${i}` ? '✓' : 'Copy'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {variants.newsletterPreview && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-orange-600 flex items-center gap-2">
                      <span>📨</span> Newsletter Preview
                    </h3>
                    <button
                      onClick={() => copyToClipboard(variants.newsletterPreview!, 'newsletter')}
                      className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                    >
                      {copied === 'newsletter' ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">
                    {variants.newsletterPreview}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

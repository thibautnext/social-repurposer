'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type ContentType = 'blog' | 'podcast' | 'youtube' | 'video'
type TabType = 'url' | 'audio' | 'video' | 'youtube'

interface Variants {
  twitter: string[]
  linkedin: string
  tiktok: string
  instagram: string[]
  facebook: string
  email: string
  // New variants
  podcastDescription?: string
  youtubeShorts?: string
  linkedinCarousel?: string[]
  newsletterPreview?: string
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
  const [variants, setVariants] = useState<Variants | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const [contentType, setContentType] = useState<ContentType>('blog')
  const [variantCount, setVariantCount] = useState(0)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/auth/login')
    }
  }, [router])

  const handleFileUpload = async (file: File, type: 'audio' | 'video') => {
    setLoading(true)
    setError('')
    setVariants(null)
    setUploadProgress(0)
    setProcessingStatus('Uploading file...')

    try {
      const token = localStorage.getItem('token')
      const formData = new FormData()
      formData.append('file', file)

      // Upload file
      const uploadUrl = type === 'audio' ? '/api/upload-audio' : '/api/upload-video'
      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      })

      if (!uploadRes.ok) {
        const err = await uploadRes.json()
        throw new Error(err.error || 'Upload failed')
      }

      const uploadData = await uploadRes.json()
      setUploadProgress(50)
      setProcessingStatus('Transcribing audio...')

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
      setUploadProgress(75)
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
      setProcessingStatus('Complete!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
      setProcessingStatus('')
    }
  }

  const handleYouTubeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!youtubeUrl) return

    setLoading(true)
    setError('')
    setVariants(null)
    setProcessingStatus('Downloading YouTube audio...')

    try {
      const token = localStorage.getItem('token')

      // Transcribe YouTube
      const transcribeRes = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          youtubeUrl,
        }),
      })

      if (!transcribeRes.ok) {
        const err = await transcribeRes.json()
        throw new Error(err.error || 'YouTube extraction failed')
      }

      const transcribeData = await transcribeRes.json()
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
      setYoutubeUrl('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
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
        throw new Error('Failed to repurpose article')
      }

      const data = await res.json()
      setVariants(data.variants)
      setContentType(data.contentType)
      setVariantCount(data.variantCount || 6)
      setUrl('')
      setText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, source: string) => {
    navigator.clipboard.writeText(text)
    setCopied(source)
    setTimeout(() => setCopied(null), 2000)
  }

  const tabs: { id: TabType; label: string; icon: string }[] = [
    { id: 'url', label: 'Blog URL', icon: '🔗' },
    { id: 'audio', label: 'Podcast', icon: '🎙️' },
    { id: 'video', label: 'Video', icon: '🎬' },
    { id: 'youtube', label: 'YouTube', icon: '📺' },
  ]

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-indigo-600">
            Content Repurposer
          </Link>
          <button
            onClick={() => {
              localStorage.removeItem('token')
              router.push('/')
            }}
            className="text-gray-600 hover:text-gray-900"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Input Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-2xl font-bold mb-6">Transform Your Content</h2>

          {/* Tabs */}
          <div className="flex space-x-2 mb-6 border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-indigo-50 text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-600 hover:text-gray-900'
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading || (!url && !text)}
                className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? 'Transforming...' : 'Transform Article'}
              </button>
            </form>
          )}

          {/* Audio Upload Tab */}
          {activeTab === 'audio' && (
            <div className="space-y-4">
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-500 transition-colors"
                onClick={() => audioInputRef.current?.click()}
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
                <div className="text-4xl mb-4">🎙️</div>
                <p className="text-lg font-medium text-gray-700">
                  Drop your podcast here
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Supports: MP3, WAV, M4A, OGG, FLAC • Max 50MB (~1 hour)
                </p>
              </div>
            </div>
          )}

          {/* Video Upload Tab */}
          {activeTab === 'video' && (
            <div className="space-y-4">
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-500 transition-colors"
                onClick={() => videoInputRef.current?.click()}
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
                <div className="text-4xl mb-4">🎬</div>
                <p className="text-lg font-medium text-gray-700">
                  Drop your video here
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Supports: MP4, MOV, AVI, MKV, WebM • Max 100MB
                </p>
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-indigo-500"
                />
                <p className="text-sm text-gray-500 mt-2">
                  Also supports: youtube.com/shorts/... and youtu.be/...
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || !youtubeUrl}
                className="w-full bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Transform YouTube Video'}
              </button>
            </form>
          )}

          {/* Progress indicator */}
          {loading && processingStatus && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{processingStatus}</span>
                {uploadProgress > 0 && (
                  <span className="text-sm text-gray-500">{uploadProgress}%</span>
                )}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress || 25}%` }}
                />
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm mt-4">
              {error}
            </div>
          )}
        </div>

        {/* Results Section */}
        {variants && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Your Content Variants</h2>
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-medium">
                  {contentType.charAt(0).toUpperCase() + contentType.slice(1)}
                </span>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                  {variantCount} variants
                </span>
              </div>
            </div>

            {/* Twitter */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-blue-400">Twitter Thread (10 tweets)</h3>
                <span className="text-sm text-gray-500">{variants.twitter.length} tweets</span>
              </div>
              <div className="space-y-3">
                {variants.twitter.map((tweet, i) => (
                  <div key={i} className="bg-gray-50 p-4 rounded border border-gray-200">
                    <div className="flex justify-between items-start gap-4">
                      <p className="text-gray-700 text-sm">{tweet}</p>
                      <button
                        onClick={() => copyToClipboard(tweet, `twitter-${i}`)}
                        className="text-indigo-600 hover:text-indigo-700 text-sm whitespace-nowrap"
                      >
                        {copied === `twitter-${i}` ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* LinkedIn */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-blue-700">LinkedIn Post</h3>
                <button
                  onClick={() => copyToClipboard(variants.linkedin, 'linkedin')}
                  className="text-indigo-600 hover:text-indigo-700 text-sm"
                >
                  {copied === 'linkedin' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-gray-700 bg-gray-50 p-4 rounded">{variants.linkedin}</p>
            </div>

            {/* TikTok */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-black">TikTok Script</h3>
                <button
                  onClick={() => copyToClipboard(variants.tiktok, 'tiktok')}
                  className="text-indigo-600 hover:text-indigo-700 text-sm"
                >
                  {copied === 'tiktok' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-gray-700 bg-gray-50 p-4 rounded whitespace-pre-wrap">{variants.tiktok}</p>
            </div>

            {/* Instagram */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-pink-600">Instagram Captions</h3>
                <span className="text-sm text-gray-500">{variants.instagram.length} variants</span>
              </div>
              <div className="space-y-3">
                {variants.instagram.map((caption, i) => (
                  <div key={i} className="bg-gray-50 p-4 rounded border border-gray-200">
                    <div className="flex justify-between items-start gap-4">
                      <p className="text-gray-700 text-sm">{caption}</p>
                      <button
                        onClick={() => copyToClipboard(caption, `instagram-${i}`)}
                        className="text-indigo-600 hover:text-indigo-700 text-sm whitespace-nowrap"
                      >
                        {copied === `instagram-${i}` ? '✓ Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Facebook */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-blue-600">Facebook Post</h3>
                <button
                  onClick={() => copyToClipboard(variants.facebook, 'facebook')}
                  className="text-indigo-600 hover:text-indigo-700 text-sm"
                >
                  {copied === 'facebook' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-gray-700 bg-gray-50 p-4 rounded">{variants.facebook}</p>
            </div>

            {/* Email */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">Email Newsletter</h3>
                <button
                  onClick={() => copyToClipboard(variants.email, 'email')}
                  className="text-indigo-600 hover:text-indigo-700 text-sm"
                >
                  {copied === 'email' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <p className="text-gray-700 bg-gray-50 p-4 rounded whitespace-pre-wrap">{variants.email}</p>
            </div>

            {/* NEW VARIANTS FOR PODCAST/VIDEO */}
            {variants.podcastDescription && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-purple-600">🎙️ Podcast Description</h3>
                  <button
                    onClick={() => copyToClipboard(variants.podcastDescription!, 'podcast-desc')}
                    className="text-indigo-600 hover:text-indigo-700 text-sm"
                  >
                    {copied === 'podcast-desc' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-gray-700 bg-gray-50 p-4 rounded whitespace-pre-wrap">
                  {variants.podcastDescription}
                </p>
              </div>
            )}

            {variants.youtubeShorts && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-red-600">📺 YouTube Shorts Script</h3>
                  <button
                    onClick={() => copyToClipboard(variants.youtubeShorts!, 'yt-shorts')}
                    className="text-indigo-600 hover:text-indigo-700 text-sm"
                  >
                    {copied === 'yt-shorts' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-gray-700 bg-gray-50 p-4 rounded whitespace-pre-wrap">
                  {variants.youtubeShorts}
                </p>
              </div>
            )}

            {variants.linkedinCarousel && variants.linkedinCarousel.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-blue-700">📑 LinkedIn Carousel (5 slides)</h3>
                  <span className="text-sm text-gray-500">{variants.linkedinCarousel.length} slides</span>
                </div>
                <div className="space-y-3">
                  {variants.linkedinCarousel.map((slide, i) => (
                    <div key={i} className="bg-gray-50 p-4 rounded border border-gray-200">
                      <div className="flex justify-between items-start gap-4">
                        <p className="text-gray-700 text-sm">{slide}</p>
                        <button
                          onClick={() => copyToClipboard(slide, `carousel-${i}`)}
                          className="text-indigo-600 hover:text-indigo-700 text-sm whitespace-nowrap"
                        >
                          {copied === `carousel-${i}` ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {variants.newsletterPreview && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-orange-600">✉️ Newsletter Preview</h3>
                  <button
                    onClick={() => copyToClipboard(variants.newsletterPreview!, 'newsletter')}
                    className="text-indigo-600 hover:text-indigo-700 text-sm"
                  >
                    {copied === 'newsletter' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-gray-700 bg-gray-50 p-4 rounded whitespace-pre-wrap">
                  {variants.newsletterPreview}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Variants {
  twitter: string[]
  linkedin: string
  tiktok: string
  instagram: string[]
  facebook: string
  email: string
}

export default function Dashboard() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [variants, setVariants] = useState<Variants | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/auth/login')
    }
  }, [router])

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

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-indigo-600">
            Social Repurposer
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

            {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}

            <button
              type="submit"
              disabled={loading || (!url && !text)}
              className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Transforming...' : 'Transform Article'}
            </button>
          </form>
        </div>

        {/* Results Section */}
        {variants && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Your Content Variants</h2>

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
          </div>
        )}
      </div>
    </main>
  )
}

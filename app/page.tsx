import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-indigo-600">Social Repurposer</h1>
          <div className="space-x-4">
            <Link href="/auth/login" className="text-gray-600 hover:text-gray-900">
              Login
            </Link>
            <Link href="/auth/signup" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center">
          <h2 className="text-5xl font-bold text-gray-900 mb-4">
            Transform Articles into <span className="text-indigo-600">10+ Content Variants</span>
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Paste an article URL or text, get instant content for Twitter, LinkedIn, TikTok, Instagram, Facebook, and email—all in seconds.
          </p>
          <Link href="/dashboard" className="inline-block bg-indigo-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-indigo-700">
            Get Started Free
          </Link>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          <div className="bg-white p-8 rounded-lg shadow">
            <div className="text-3xl mb-4">🐦</div>
            <h3 className="text-xl font-bold mb-2">Twitter Threads</h3>
            <p className="text-gray-600">Generate engaging tweet threads with proper formatting</p>
          </div>
          <div className="bg-white p-8 rounded-lg shadow">
            <div className="text-3xl mb-4">💼</div>
            <h3 className="text-xl font-bold mb-2">LinkedIn Posts</h3>
            <p className="text-gray-600">Professional posts that drive engagement and connections</p>
          </div>
          <div className="bg-white p-8 rounded-lg shadow">
            <div className="text-3xl mb-4">🎬</div>
            <h3 className="text-xl font-bold mb-2">TikTok Scripts</h3>
            <p className="text-gray-600">Viral-ready scripts with hooks and creative angles</p>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="mt-20">
          <h3 className="text-3xl font-bold text-center mb-12">Simple, Transparent Pricing</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Starter */}
            <div className="bg-white p-8 rounded-lg shadow">
              <h4 className="text-xl font-bold mb-2">Starter</h4>
              <p className="text-4xl font-bold text-indigo-600 mb-4">Free</p>
              <ul className="space-y-2 text-gray-600 mb-6">
                <li>✓ 5 articles/month</li>
                <li>✓ Basic variants</li>
                <li>✓ Community support</li>
              </ul>
              <button className="w-full border-2 border-indigo-600 text-indigo-600 py-2 rounded-lg font-semibold">
                Get Started
              </button>
            </div>

            {/* Pro */}
            <div className="bg-indigo-600 text-white p-8 rounded-lg shadow relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-yellow-400 text-gray-900 px-4 py-1 rounded-full text-sm font-semibold">
                Popular
              </div>
              <h4 className="text-xl font-bold mb-2">Pro</h4>
              <p className="text-4xl font-bold mb-4">$29<span className="text-lg">/mo</span></p>
              <ul className="space-y-2 mb-6">
                <li>✓ 100 articles/month</li>
                <li>✓ All variants + custom</li>
                <li>✓ Bulk publish ready</li>
                <li>✓ Email support</li>
              </ul>
              <button className="w-full bg-white text-indigo-600 py-2 rounded-lg font-semibold">
                Subscribe Now
              </button>
            </div>

            {/* Enterprise */}
            <div className="bg-white p-8 rounded-lg shadow">
              <h4 className="text-xl font-bold mb-2">Enterprise</h4>
              <p className="text-4xl font-bold text-indigo-600 mb-4">Custom</p>
              <ul className="space-y-2 text-gray-600 mb-6">
                <li>✓ Unlimited articles</li>
                <li>✓ Custom AI models</li>
                <li>✓ API access</li>
                <li>✓ Dedicated support</li>
              </ul>
              <button className="w-full border-2 border-indigo-600 text-indigo-600 py-2 rounded-lg font-semibold">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

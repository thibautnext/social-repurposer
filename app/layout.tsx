import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Social Repurposer - Transform Articles into Content',
  description: 'Turn any article into Twitter, LinkedIn, TikTok, Instagram and more',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50">{children}</body>
    </html>
  )
}

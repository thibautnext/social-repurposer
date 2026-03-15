import { NextRequest, NextResponse } from 'next/server'
import { verifyRequestToken } from '@/lib/auth'
import {
  fetchArticleContent,
  repurposeArticle,
  ContentVariants,
  ContentType,
  countVariants,
} from '@/lib/repurpose'

const POSTGREST_URL = process.env.POSTGREST_URL || 'https://supabase.novalys.io'

export async function POST(req: NextRequest) {
  try {
    const user = verifyRequestToken(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { url, text, transcript, contentType } = await req.json()

    // Determine content type and source
    let content = ''
    let finalContentType: ContentType = 'blog'

    if (transcript) {
      // Audio/video transcript provided
      content = transcript
      finalContentType = (contentType as ContentType) || 'podcast'
    } else if (text) {
      // Direct text provided
      content = text
      finalContentType = 'blog'
    } else if (url) {
      // Fetch content from URL
      content = await fetchArticleContent(url)
      finalContentType = 'blog'
    } else {
      return NextResponse.json(
        { error: 'Either URL, text, or transcript is required' },
        { status: 400 }
      )
    }

    // Repurpose the content
    const variants: ContentVariants = await repurposeArticle(content, finalContentType)
    const variantCount = countVariants(variants)

    // Save article and variants to database
    const anonKey = process.env.POSTGREST_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneXZxbnBienF3bnVsd21jcmxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MjM2NjMsImV4cCI6MjA2NjE5OTY2M30.WLCWOlh2YpU3avjq_lSkLyf8hWW0yrWfIN9BkCpRIVw'
    
    const articleRes = await fetch(`${POSTGREST_URL}/rest/v1/sr_articles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`,
        'apikey': anonKey,
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        user_id: user.userId,
        url: url || null,
        content: content.substring(0, 5000),
        content_type: finalContentType,
        audio_transcript: transcript || null,
        processing_status: 'ready',
        created_at: new Date().toISOString(),
      }),
    })

    let articleId = null
    if (articleRes.ok) {
      const articles = await articleRes.json()
      articleId = articles[0]?.id
    } else {
      console.error('Failed to save article:', await articleRes.text())
    }

    // Save variants
    if (articleId) {
      await fetch(`${POSTGREST_URL}/rest/v1/sr_variants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${anonKey}`,
          'apikey': anonKey,
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({
          article_id: articleId,
          platform: 'all',
          content: JSON.stringify(variants),
          created_at: new Date().toISOString(),
        }),
      })
    }

    return NextResponse.json({
      success: true,
      articleId,
      contentType: finalContentType,
      variantCount,
      variants,
    })
  } catch (error) {
    console.error('Repurpose error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to repurpose article',
      },
      { status: 500 }
    )
  }
}

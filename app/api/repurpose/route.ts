import { NextRequest, NextResponse } from 'next/server'
import { verifyRequestToken } from '@/lib/auth'
import {
  fetchArticleContent,
  repurposeArticle,
  ContentVariants,
} from '@/lib/repurpose'

const POSTGREST_URL = process.env.POSTGREST_URL || 'https://supabase.novalys.io'

export async function POST(req: NextRequest) {
  try {
    const user = verifyRequestToken(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { url, text } = await req.json()

    if (!url && !text) {
      return NextResponse.json(
        { error: 'Either URL or text content is required' },
        { status: 400 }
      )
    }

    let content = text
    if (url) {
      content = await fetchArticleContent(url)
    }

    // Repurpose the article
    const variants: ContentVariants = await repurposeArticle(content)

    // Save article and variants to database
    const articleRes = await fetch(`${POSTGREST_URL}/rest/v1/articles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.POSTGREST_ANON_KEY}`,
      },
      body: JSON.stringify({
        user_id: user.userId,
        url: url || null,
        content: content.substring(0, 5000),
        created_at: new Date().toISOString(),
      }),
    })

    const articles = await articleRes.json()
    const articleId = articles[0]?.id

    // Save variants
    if (articleId) {
      await fetch(`${POSTGREST_URL}/rest/v1/variants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.POSTGREST_ANON_KEY}`,
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

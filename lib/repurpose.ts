import Anthropic from '@anthropic-ai/sdk'
import * as cheerio from 'cheerio'
import axios from 'axios'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface ContentVariants {
  twitter: string[]
  linkedin: string
  tiktok: string
  instagram: string[]
  facebook: string
  email: string
  // New variants for Phase 1
  podcastDescription?: string
  youtubeShorts?: string
  linkedinCarousel?: string[]
  newsletterPreview?: string
}

export type ContentType = 'blog' | 'podcast' | 'youtube' | 'video'

export async function fetchArticleContent(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    const $ = cheerio.load(response.data)
    
    // Remove script and style elements
    $('script, style').remove()
    
    // Extract text content
    let text = ''
    
    // Try to get article content
    const article =
      $('article').text() ||
      $('[role="main"]').text() ||
      $('main').text() ||
      $('body').text()

    text = article.replace(/\s+/g, ' ').trim()
    
    // Get title
    const title =
      $('h1').first().text() ||
      $('title').text() ||
      'Untitled'

    return `Title: ${title}\n\nContent: ${text.substring(0, 3000)}`
  } catch (error) {
    throw new Error(`Failed to fetch article: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function repurposeArticle(
  content: string,
  contentType: ContentType = 'blog'
): Promise<ContentVariants> {
  const variants: ContentVariants = {
    twitter: [],
    linkedin: '',
    tiktok: '',
    instagram: [],
    facebook: '',
    email: '',
  }

  try {
    // Adapt prompt based on content type
    const contentLabel = contentType === 'blog' ? 'article' : contentType === 'podcast' ? 'podcast transcript' : 'video transcript'

    // Twitter Thread (10 tweets)
    const twitterResponse = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `Convert this ${contentLabel} into a 10-tweet thread. Each tweet should be under 280 characters. Format as a numbered list.\n\n${content}`,
        },
      ],
    })

    const twitterText =
      twitterResponse.content[0].type === 'text' ? twitterResponse.content[0].text : ''
    variants.twitter = twitterText
      .split('\n')
      .filter((line) => line.trim())
      .slice(0, 10)

    // LinkedIn Post
    const linkedinResponse = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: `Create a professional LinkedIn post (max 500 chars) from this ${contentLabel}:\n\n${content}`,
        },
      ],
    })

    variants.linkedin =
      linkedinResponse.content[0].type === 'text'
        ? linkedinResponse.content[0].text
        : ''

    // TikTok Script
    const tiktokResponse = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `Create a casual, engaging TikTok script (30-60 seconds) from this ${contentLabel}. Include a hook at the start:\n\n${content}`,
        },
      ],
    })

    variants.tiktok =
      tiktokResponse.content[0].type === 'text'
        ? tiktokResponse.content[0].text
        : ''

    // Instagram Captions (3 variants)
    const instagramResponse = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      messages: [
        {
          role: 'user',
          content: `Create 3 different Instagram captions (max 300 chars each) from this ${contentLabel}. Separate with ---\n\n${content}`,
        },
      ],
    })

    const instagramText =
      instagramResponse.content[0].type === 'text'
        ? instagramResponse.content[0].text
        : ''
    variants.instagram = instagramText.split('---').map((cap) => cap.trim()).slice(0, 3)

    // Facebook Post
    const facebookResponse = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 400,
      messages: [
        {
          role: 'user',
          content: `Create an engaging Facebook post (max 400 chars) designed to drive engagement and shares:\n\n${content}`,
        },
      ],
    })

    variants.facebook =
      facebookResponse.content[0].type === 'text'
        ? facebookResponse.content[0].text
        : ''

    // Email Newsletter
    const emailResponse = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      messages: [
        {
          role: 'user',
          content: `Create an engaging email newsletter summary from this ${contentLabel}. Include subject line and body:\n\n${content}`,
        },
      ],
    })

    variants.email =
      emailResponse.content[0].type === 'text' ? emailResponse.content[0].text : ''

    // === NEW VARIANTS FOR PODCAST/VIDEO CONTENT ===
    if (contentType !== 'blog') {
      // Podcast Episode Description
      const podcastDescResponse = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [
          {
            role: 'user',
            content: `Create a compelling podcast episode description (100-150 words) optimized for podcast directories like Apple Podcasts and Spotify. Include key topics covered and a hook to entice listeners:\n\n${content}`,
          },
        ],
      })

      variants.podcastDescription =
        podcastDescResponse.content[0].type === 'text'
          ? podcastDescResponse.content[0].text
          : ''

      // YouTube Shorts Script
      const youtubeShortsResponse = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: `Create a 15-30 second YouTube Shorts script from this content. Start with an attention-grabbing hook, deliver one key insight, end with a call-to-action. Format: [HOOK] [INSIGHT] [CTA]:\n\n${content}`,
          },
        ],
      })

      variants.youtubeShorts =
        youtubeShortsResponse.content[0].type === 'text'
          ? youtubeShortsResponse.content[0].text
          : ''

      // LinkedIn Carousel (5 slides)
      const carouselResponse = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: `Create a 5-slide LinkedIn carousel from this content. Each slide should have a headline (max 10 words) and supporting text (max 30 words). Format each slide as: SLIDE X: [Headline] | [Text]. Separate slides with ---:\n\n${content}`,
          },
        ],
      })

      const carouselText =
        carouselResponse.content[0].type === 'text'
          ? carouselResponse.content[0].text
          : ''
      variants.linkedinCarousel = carouselText.split('---').map((s) => s.trim()).slice(0, 5)

      // Newsletter Preview/Teaser
      const newsletterPreviewResponse = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 150,
        messages: [
          {
            role: 'user',
            content: `Create a newsletter preview teaser (max 50 words) that makes readers want to learn more. Include intrigue and a strong hook:\n\n${content}`,
          },
        ],
      })

      variants.newsletterPreview =
        newsletterPreviewResponse.content[0].type === 'text'
          ? newsletterPreviewResponse.content[0].text
          : ''
    }
  } catch (error) {
    throw new Error(
      `Failed to repurpose article: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }

  return variants
}

/**
 * Count total variants generated
 */
export function countVariants(variants: ContentVariants): number {
  let count = 6 // Base variants always present

  if (variants.podcastDescription) count++
  if (variants.youtubeShorts) count++
  if (variants.linkedinCarousel && variants.linkedinCarousel.length > 0) count++
  if (variants.newsletterPreview) count++

  return count
}

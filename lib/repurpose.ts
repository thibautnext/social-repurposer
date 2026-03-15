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

/**
 * Generate a single variant using Claude API
 */
async function generateVariant(
  prompt: string,
  maxTokens: number = 500
): Promise<string> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  })
  return response.content[0].type === 'text' ? response.content[0].text : ''
}

export async function repurposeArticle(
  content: string,
  contentType: ContentType = 'blog'
): Promise<ContentVariants> {
  const contentLabel = contentType === 'blog' 
    ? 'article' 
    : contentType === 'podcast' 
    ? 'podcast transcript' 
    : 'video transcript'

  // Define all prompts
  const prompts = {
    twitter: {
      prompt: `Convert this ${contentLabel} into a 10-tweet thread. Each tweet should be under 280 characters. Format as a numbered list.\n\n${content}`,
      maxTokens: 1000,
    },
    linkedin: {
      prompt: `Create a professional LinkedIn post (max 500 chars) from this ${contentLabel}:\n\n${content}`,
      maxTokens: 500,
    },
    tiktok: {
      prompt: `Create a casual, engaging TikTok script (30-60 seconds) from this ${contentLabel}. Include a hook at the start:\n\n${content}`,
      maxTokens: 300,
    },
    instagram: {
      prompt: `Create 3 different Instagram captions (max 300 chars each) from this ${contentLabel}. Separate with ---\n\n${content}`,
      maxTokens: 600,
    },
    facebook: {
      prompt: `Create an engaging Facebook post (max 400 chars) designed to drive engagement and shares:\n\n${content}`,
      maxTokens: 400,
    },
    email: {
      prompt: `Create an engaging email newsletter summary from this ${contentLabel}. Include subject line and body:\n\n${content}`,
      maxTokens: 600,
    },
  }

  // Audio/video specific prompts
  const audioPrompts = contentType !== 'blog' ? {
    podcastDescription: {
      prompt: `Create a compelling podcast episode description (100-150 words) optimized for podcast directories like Apple Podcasts and Spotify. Include key topics covered and a hook to entice listeners:\n\n${content}`,
      maxTokens: 300,
    },
    youtubeShorts: {
      prompt: `Create a 15-30 second YouTube Shorts script from this content. Start with an attention-grabbing hook, deliver one key insight, end with a call-to-action. Format: [HOOK] [INSIGHT] [CTA]:\n\n${content}`,
      maxTokens: 200,
    },
    linkedinCarousel: {
      prompt: `Create a 5-slide LinkedIn carousel from this content. Each slide should have a headline (max 10 words) and supporting text (max 30 words). Format each slide as: SLIDE X: [Headline] | [Text]. Separate slides with ---:\n\n${content}`,
      maxTokens: 500,
    },
    newsletterPreview: {
      prompt: `Create a newsletter preview teaser (max 50 words) that makes readers want to learn more. Include intrigue and a strong hook:\n\n${content}`,
      maxTokens: 150,
    },
  } : {}

  try {
    // Run ALL API calls in parallel for maximum speed
    const [
      twitterResult,
      linkedinResult,
      tiktokResult,
      instagramResult,
      facebookResult,
      emailResult,
      ...audioResults
    ] = await Promise.all([
      generateVariant(prompts.twitter.prompt, prompts.twitter.maxTokens),
      generateVariant(prompts.linkedin.prompt, prompts.linkedin.maxTokens),
      generateVariant(prompts.tiktok.prompt, prompts.tiktok.maxTokens),
      generateVariant(prompts.instagram.prompt, prompts.instagram.maxTokens),
      generateVariant(prompts.facebook.prompt, prompts.facebook.maxTokens),
      generateVariant(prompts.email.prompt, prompts.email.maxTokens),
      // Audio variants (only if not blog)
      ...(contentType !== 'blog' ? [
        generateVariant(audioPrompts.podcastDescription!.prompt, audioPrompts.podcastDescription!.maxTokens),
        generateVariant(audioPrompts.youtubeShorts!.prompt, audioPrompts.youtubeShorts!.maxTokens),
        generateVariant(audioPrompts.linkedinCarousel!.prompt, audioPrompts.linkedinCarousel!.maxTokens),
        generateVariant(audioPrompts.newsletterPreview!.prompt, audioPrompts.newsletterPreview!.maxTokens),
      ] : []),
    ])

    // Build variants object
    const variants: ContentVariants = {
      twitter: twitterResult.split('\n').filter((line) => line.trim()).slice(0, 10),
      linkedin: linkedinResult,
      tiktok: tiktokResult,
      instagram: instagramResult.split('---').map((cap) => cap.trim()).slice(0, 3),
      facebook: facebookResult,
      email: emailResult,
    }

    // Add audio variants if available
    if (contentType !== 'blog' && audioResults.length === 4) {
      variants.podcastDescription = audioResults[0]
      variants.youtubeShorts = audioResults[1]
      variants.linkedinCarousel = audioResults[2].split('---').map((s) => s.trim()).slice(0, 5)
      variants.newsletterPreview = audioResults[3]
    }

    return variants
  } catch (error) {
    throw new Error(
      `Failed to repurpose article: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
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

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
}

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

export async function repurposeArticle(content: string): Promise<ContentVariants> {
  const variants: ContentVariants = {
    twitter: [],
    linkedin: '',
    tiktok: '',
    instagram: [],
    facebook: '',
    email: '',
  }

  try {
    // Twitter Thread (10 tweets)
    const twitterResponse = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `Convert this article into a 10-tweet thread. Each tweet should be under 280 characters. Format as a numbered list.\n\n${content}`,
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
          content: `Create a professional LinkedIn post (max 500 chars) from this article:\n\n${content}`,
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
          content: `Create a casual, engaging TikTok script (30-60 seconds) from this article. Include a hook at the start:\n\n${content}`,
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
          content: `Create 3 different Instagram captions (max 300 chars each) from this article. Separate with ---\n\n${content}`,
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
          content: `Create an engaging email newsletter summary from this article. Include subject line and body:\n\n${content}`,
        },
      ],
    })

    variants.email =
      emailResponse.content[0].type === 'text' ? emailResponse.content[0].text : ''
  } catch (error) {
    throw new Error(
      `Failed to repurpose article: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }

  return variants
}

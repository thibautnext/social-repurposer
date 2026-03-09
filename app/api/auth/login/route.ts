import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key'
const POSTGREST_URL = process.env.POSTGREST_URL || 'https://supabase.novalys.io'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Get user from database
    const response = await fetch(
      `${POSTGREST_URL}/rest/v1/sr_users?email=eq.${encodeURIComponent(email)}`,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.POSTGREST_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneXZxbnBienF3bnVsd21jcmxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MjM2NjMsImV4cCI6MjA2NjE5OTY2M30.WLCWOlh2YpU3avjq_lSkLyf8hWW0yrWfIN9BkCpRIVw'}`,
          'apikey': `${process.env.POSTGREST_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneXZxbnBienF3bnVsd21jcmxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MjM2NjMsImV4cCI6MjA2NjE5OTY2M30.WLCWOlh2YpU3avjq_lSkLyf8hWW0yrWfIN9BkCpRIVw'}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error('User not found')
    }

    const users = await response.json()
    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const user = users[0]

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: 'app_user' },
      JWT_SECRET,
      { expiresIn: '30d' }
    )

    return NextResponse.json({ token, user: { id: user.id, email: user.email } })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

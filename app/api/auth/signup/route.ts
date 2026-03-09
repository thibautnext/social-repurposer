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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Insert user into database via PostgREST
    const response = await fetch(`${POSTGREST_URL}/rest/v1/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.POSTGREST_ANON_KEY}`,
      },
      body: JSON.stringify({
        email,
        password_hash: hashedPassword,
        created_at: new Date().toISOString(),
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to create user')
    }

    const user = await response.json()

    // Generate JWT token
    const token = jwt.sign(
      { userId: user[0]?.id, email: user[0]?.email, role: 'app_user' },
      JWT_SECRET,
      { expiresIn: '30d' }
    )

    return NextResponse.json({ token, user: { id: user[0]?.id, email: user[0]?.email } })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

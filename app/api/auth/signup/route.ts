import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { Pool } from 'pg'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

export async function POST(req: NextRequest) {
  const client = await pool.connect()
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

    // Insert user into database
    const result = await client.query(
      'INSERT INTO sr_users (email, password_hash, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING id, email',
      [email, hashedPassword]
    )

    if (!result.rows.length) {
      throw new Error('Failed to create user')
    }

    const user = result.rows[0]

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: 'app_user' },
      JWT_SECRET,
      { expiresIn: '30d' }
    )

    return NextResponse.json({ token, user: { id: user.id, email: user.email } })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}

import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key'

export interface DecodedToken {
  userId: string
  email: string
  role: string
  iat: number
  exp: number
}

export function verifyToken(token: string): DecodedToken | null {
  try {
    return jwt.verify(token, JWT_SECRET) as DecodedToken
  } catch {
    return null
  }
}

export function extractTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }
  return authHeader.slice(7)
}

export function verifyRequestToken(req: NextRequest): DecodedToken | null {
  const token = extractTokenFromRequest(req)
  if (!token) {
    return null
  }
  return verifyToken(token)
}

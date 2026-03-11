import { NextRequest, NextResponse } from 'next/server'

// Check auth status
export async function GET(request: NextRequest) {
  const pin = request.cookies.get('auth_pin')?.value
  if (pin === process.env.AUTH_PIN) {
    return NextResponse.json({ authenticated: true })
  }
  return NextResponse.json({ authenticated: false }, { status: 401 })
}

// Login with PIN
export async function POST(request: NextRequest) {
  const { pin } = await request.json()

  if (!pin || pin !== process.env.AUTH_PIN) {
    return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 })
  }

  const response = NextResponse.json({ authenticated: true })
  response.cookies.set('auth_pin', pin, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: '/',
  })

  return response
}

// Logout
export async function DELETE() {
  const response = NextResponse.json({ authenticated: false })
  response.cookies.delete('auth_pin')
  return response
}

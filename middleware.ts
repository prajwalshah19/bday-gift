import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Allow auth endpoints through
  if (request.nextUrl.pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  // Protect API routes with PIN cookie
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const pin = request.cookies.get('auth_pin')?.value
    if (pin !== process.env.AUTH_PIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/api/:path*'],
}

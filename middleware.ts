import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Malicious scanner and exploit probes to block immediately at the edge
const BLOCKED_SCANNER_PATHS = [
  '/.env',
  '/.git',
  '/wp-admin',
  '/wp-login',
  '/wp-includes',
  '/phpmyadmin',
  '/pma',
  '/xmlrpc.php',
  '/.aws',
  '/actuator',
  '/eval-stdin',
  '/console',
  '/autodiscover',
]

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname.toLowerCase()

  // 1. Block common exploit and scanner probes
  for (const blocked of BLOCKED_SCANNER_PATHS) {
    if (pathname.startsWith(blocked)) {
      return new NextResponse('Not Found', { status: 404 })
    }
  }

  // 2. Pass request and inject robust security headers
  const response = NextResponse.next()

  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), screen-wake-lock=()',
  )
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload',
  )
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static files:
     * - _next/static (static chunks)
     * - _next/image (image optimization files)
     * - favicon.ico, icon.png
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Allow unrestricted access to all routes
  return NextResponse.next()
}

// Keep the matcher configuration but it won't restrict access
export const config = {
  matcher: ['/create-agent/:path*', '/chat/:path*'],
} 
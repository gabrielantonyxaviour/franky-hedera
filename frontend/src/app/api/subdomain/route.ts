import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const subdomain = hostname.split('.')[0]
  
  // Log for debugging
  console.log(`API subdomain route called for: ${hostname}, subdomain: ${subdomain}`)
  
  return NextResponse.json({ 
    message: 'Hello from subdomain API!',
    subdomain,
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const subdomain = hostname.split('.')[0]
  
  // Log for debugging
  console.log(`API subdomain POST route called for: ${hostname}, subdomain: ${subdomain}`)
  
  return NextResponse.json({ 
    message: 'Received POST request on subdomain API',
    subdomain,
    timestamp: new Date().toISOString()
  })
} 
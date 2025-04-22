'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function SubdomainPage() {
  const pathname = usePathname()
  
  useEffect(() => {
    // Log for debugging
    console.log('Subdomain page loaded, pathname:', pathname)
  }, [pathname])

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-8">Hello!</h1>
        <p className="text-xl">You've reached a Franky agent subdomain.</p>
      </div>
    </div>
  )
} 
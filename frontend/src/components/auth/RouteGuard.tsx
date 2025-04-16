'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useWalletStore } from '@/store/useWalletStore'

interface RouteGuardProps {
  children: React.ReactNode
}

const protectedRoutes = ['/create-agent']

export default function RouteGuard({ children }: RouteGuardProps) {
  const { isConnected } = useWalletStore()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Check if the current route is protected
    const isProtectedRoute = protectedRoutes.some(route => 
      pathname === route || pathname.startsWith(`${route}/`)
    )

    // If route is protected and user is not connected, redirect to home
    if (isProtectedRoute && !isConnected) {
      router.push('/')
    }
  }, [isConnected, pathname, router])

  return <>{children}</>
} 
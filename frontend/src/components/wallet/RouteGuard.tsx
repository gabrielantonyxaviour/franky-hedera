'use client'

import { ReactNode } from 'react'

interface RouteGuardProps {
  children: ReactNode
}

export function RouteGuard({ children }: RouteGuardProps) {
  // No route protection - allow access to all routes
  return <>{children}</>
} 
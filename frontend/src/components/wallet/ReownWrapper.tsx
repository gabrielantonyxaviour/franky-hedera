'use client'

import { ReactNode } from 'react'
import { AppKitProvider } from '@/components/wallet/appkitprovider'
import ReownProviders from '@/components/ReownProviders'

interface ReownWrapperProps {
  children: ReactNode
}

export default function ReownWrapper({ children }: ReownWrapperProps) {
  return (
    <ReownProviders>
      <AppKitProvider>
        {children}
      </AppKitProvider>
    </ReownProviders>
  )
} 
'use client'

import dynamic from 'next/dynamic'
import { AppKitProvider } from '@/components/wallet/appkitprovider'

// Use dynamic import with SSR disabled to avoid hydration issues
const ReownWalletHeaderWithNoSSR = dynamic(
  () => import('./ReownWalletHeader'),
  { ssr: false }
)

export default function HeaderWalletWrapper() {
  return (
    <AppKitProvider>
      <ReownWalletHeaderWithNoSSR />
    </AppKitProvider>
  )
} 
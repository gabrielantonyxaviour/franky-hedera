'use client'

import dynamic from 'next/dynamic'
import { AppKitProvider } from '@/components/wallet/appkitprovider'
import { ReownProviders } from '@/components/ReownProviders'

// Use dynamic import with SSR disabled to avoid hydration issues
const ReownWalletHeaderWithNoSSR = dynamic(
  () => import('./ReownWalletHeader'),
  { ssr: false }
)

export default function HeaderWalletWrapper() {
  return (
    <ReownProviders>
      <AppKitProvider>
        <ReownWalletHeaderWithNoSSR />
      </AppKitProvider>
    </ReownProviders>
  )
} 
import type { Metadata } from 'next'
import ContextProvider from '@/context'

export const metadata: Metadata = {
  title: 'Reown Wallet Test',
  description: 'Test page for Reown wallet integration',
}

export default function TestWalletLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Pass null for cookies in test environment
  return (
    <ContextProvider cookies={null}>
      {children}
    </ContextProvider>
  )
} 
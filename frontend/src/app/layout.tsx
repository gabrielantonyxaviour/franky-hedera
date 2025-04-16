import './globals.css'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import ContextProvider from '@/context'
import Script from 'next/script'

export const metadata: Metadata = {
  title: 'FRANKY - Custom AI Agent Creator',
  description: 'Create custom AI agents with DeFi tools integration',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersObj = await headers();
  const cookies = headersObj.get('cookie');

  return (
    <html lang="en">
      <head>
        {/* Define this on the window to help AppKit identify and register the web components */}
        <script dangerouslySetInnerHTML={{ 
          __html: `window.projectId = '07ae1f8ae1086fd0dfb5547956caa349';` 
        }} />
      </head>
      <body>
        <ContextProvider cookies={cookies}>
          {children}
        </ContextProvider>

        {/* Load Web3Modal in case AppKit fails to load it */}
        <Script 
          src="https://unpkg.com/@web3modal/standalone@2.4.1/dist/index.umd.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}

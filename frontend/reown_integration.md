example project:

package.json:

{
  "name": "next-wagmi-app-router",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@reown/appkit": "1.7.0",
    "@reown/appkit-adapter-solana": "1.7.0",
    "@reown/appkit-adapter-wagmi": "1.7.0",
    "@solana/web3.js": "^1.98.0",
    "@tanstack/react-query": "5.62.8",
    "next": "15.1.3",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "viem": "^2.21.44",
    "wagmi": "^2.12.31"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^8",
    "eslint-config-next": "15.1.3",
    "typescript": "^5"
  }
}

tsconfig.json:

{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}

next.config.ts:

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: config => {
    config.externals.push('pino-pretty', 'lokijs', 'encoding')
    return config
  }
};

export default nextConfig;


.eslintrc.json:

{
  "extends": ["next/core-web-vitals", "next/typescript"]
}


src/app/globals.css:

:root {
  --background: #ffffff;
  --foreground: #171717;
}

html,
body {
  max-width: 100vw;
  overflow-x: hidden;
}

body {
  color: var(--foreground);
  background: var(--background);
  font-family: Arial, Helvetica, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

* {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}

a {
  color: inherit;
  text-decoration: none;
}

@media (prefers-color-scheme: dark) {
  html {
    color-scheme: dark;
  }
}

section {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 16px;
  background-color: #f9f9f9;
  padding: 13px;
  margin: 10px;
  width: 90%;
  text-align: left;
}

.pages {
  align-items: center;
  justify-items: center;
  text-align: center;
}

button {
  padding: 10px 15px;
  background-color: white;
  color: black;
  border: 2px solid black;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin: 15px; /* Space between buttons */
}

button:hover {
  background-color: black;
    color: white;
}

button:active {
  background-color: #333; /* Dark gray on click */
    color: white;
}

h1 {
  margin: 20px;
}

pre {
  white-space: pre-wrap; /* Wrap text */
  word-wrap: break-word; /* Break long words */
  word-break: break-all;
}


.link-button {
  background-color: black;
  color: white;
  padding: 5px 10px;
  text-decoration: none;
  border-radius: 5px;
}

.link-button:hover {
  background-color: #333;  /* Darken the background on hover */
}

.link-button:hover {
  background-color: white;  /* Change background to white on hover */
  color: black;  /* Change text color to black on hover */
}

.advice {
  text-align: 'center';
   margin-bottom: 10px;
   line-height: 25px;
}

src/app/layout.tsx:

import type { Metadata } from "next";


import { headers } from 'next/headers' // added
import './globals.css';
import ContextProvider from '@/context'

export const metadata: Metadata = {
  title: "AppKit in Next.js + multichain",
  description: "AppKit example dApp",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersData = await headers();
  const cookies = headersData.get('cookie');

  return (
    <html lang="en">
      <body>
        <ContextProvider cookies={cookies}>{children}</ContextProvider>
      </body>
    </html>
  );
}

src/app/page.tsx:

import { ConnectButton } from "@/components/ConnectButton";
import { InfoList } from "@/components/InfoList";
import { ActionButtonList } from "@/components/ActionButtonList";
import Image from 'next/image';

export default function Home() {

  return (
    <div className={"pages"}>
      <Image src="/reown.svg" alt="Reown" width={150} height={150} priority />
      <h1>AppKit multichain Next.js App Router Example</h1>

      <ConnectButton />
      <ActionButtonList />
      <div className="advice">
        <p>
          This projectId only works on localhost. <br/>Go to <a href="https://cloud.reown.com" target="_blank" className="link-button" rel="Reown Cloud">Reown Cloud</a> to get your own.
        </p>
      </div>
      <InfoList />
    </div>
  );
}

src/app/fonts/

GeistMonoVF.woff

GeistVF.woff


src/context/index.tsx

'use client'

import { wagmiAdapter, solanaWeb3JsAdapter, projectId, networks } from '@/config'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createAppKit } from '@reown/appkit/react'
import React, { type ReactNode } from 'react'
import { cookieToInitialState, WagmiProvider, type Config } from 'wagmi'

// Set up queryClient
const queryClient = new QueryClient()

// Set up metadata
const metadata = {
  name: 'next-reown-appkit',
  description: 'next-reown-appkit',
  url: 'https://github.com/0xonerb/next-reown-appkit-ssr', // origin must match your domain & subdomain
  icons: ['https://avatars.githubusercontent.com/u/179229932']
}

// Create the modal
export const modal = createAppKit({
  adapters: [wagmiAdapter, solanaWeb3JsAdapter],
  projectId,
  networks,
  metadata,
  themeMode: 'light',
  features: {
    analytics: true // Optional - defaults to your Cloud configuration
  },
  themeVariables: {
    '--w3m-accent': '#000000',
  }
})

function ContextProvider({ children, cookies }: { children: ReactNode; cookies: string | null }) {
  const initialState = cookieToInitialState(wagmiAdapter.wagmiConfig as Config, cookies)

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig as Config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}

export default ContextProvider

src/hooks/useClientMount.ts:

'use client'
import { useEffect, useState } from "react";

export function useClientMounted() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []); // Runs only on mount

  return mounted;
}

src/components/ActionButtonList.tsx:

'use client'
import { useDisconnect, useAppKit, useAppKitNetwork  } from '@reown/appkit/react'
import { networks } from '@/config'

export const ActionButtonList = () => {
    const { disconnect } = useDisconnect();
    const { open } = useAppKit();
    const { switchNetwork } = useAppKitNetwork();

    const handleDisconnect = async () => {
      try {
        await disconnect();
      } catch (error) {
        console.error("Failed to disconnect:", error);
      }
    }
  return (
    <div>
        <button onClick={() => open()}>Open</button>
        <button onClick={handleDisconnect}>Disconnect</button>
        <button onClick={() => switchNetwork(networks[1]) }>Switch</button>
    </div>
  )
}

src/components/ConnectButton.tsx:

'use client'

export const ConnectButton = () => {
  return (
    <div >
        <appkit-button />
    </div>
  )
}

src/components/InfoList.tsx:

'use client'

import { useEffect } from 'react'
import {
    useAppKitState,
    useAppKitTheme,
    useAppKitEvents,
    useAppKitAccount,
    useWalletInfo
     } from '@reown/appkit/react'
import { useClientMounted } from "@/hooks/useClientMount";

export const InfoList = () => {
    const kitTheme = useAppKitTheme();
    const state = useAppKitState();
    const {address, caipAddress, isConnected, embeddedWalletInfo} = useAppKitAccount();
    const events = useAppKitEvents()
    const walletInfo = useWalletInfo()
    const mounted = useClientMounted();

    useEffect(() => {
        console.log("Events: ", events);
    }, [events]);

  return !mounted ? null : (
    <>
        <section>
            <h2>useAppKit</h2>
            <pre>
                Address: {address}<br />
                caip Address: {caipAddress}<br />
                Connected: {isConnected.toString()}<br />
                Account Type: {embeddedWalletInfo?.accountType}<br />
                {embeddedWalletInfo?.user?.email && (`Email: ${embeddedWalletInfo?.user?.email}\n`)}
                {embeddedWalletInfo?.user?.username && (`Username: ${embeddedWalletInfo?.user?.username}\n`)}
                {embeddedWalletInfo?.authProvider && (`Provider: ${embeddedWalletInfo?.authProvider}\n`)}
            </pre>
        </section>

        <section>
            <h2>Theme</h2>
            <pre>
                Theme: {kitTheme.themeMode}<br />
            </pre>
        </section>

        <section>
            <h2>State</h2>
            <pre>
                Selected Network ID: {state.selectedNetworkId?.toString()}<br />
                loading: {state.loading.toString()}<br />
                open: {state.open.toString()}<br />
            </pre>
        </section>

        <section>
            <h2>WalletInfo</h2>
            <pre>
                Name: {walletInfo.walletInfo?.name?.toString()}<br />
            </pre>
        </section>
    </>
  )
}

.env.example:

NEXT_PUBLIC_PROJECT_ID=
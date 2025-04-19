AppKit provides a simple solution for integrating with “Sign In With Ethereum” (SIWE), a new form of authentication that enables users to control their digital identity with their Ethereum account. SIWE is a standard also known as EIP-4361.

​
One-Click Auth

One-Click Auth represents a key advancement within WalletConnect v2, streamlining the user authentication process in AppKit by enabling them to seamlessly connect with a wallet and sign a SIWE message with just one click. It supports both EIP-1271, the standard for signature validation in smart accounts, and EIP-6492, which enables signature validation for smart accounts (contracts) that are not yet deployed, allowing messages to be signed without requiring prior deployment.

Connecting a wallet, proving control of an address with an off-chain signature, authorizing specific actions. These are the kinds of authorizations that can be encoded as “ReCaps”. ReCaps are permissions for a specific website or dapp that can be compactly encoded as a long string in the message you sign and translated by any wallet into a straight-forward one-sentence summary. WalletConnect uses permissions expressed as ReCaps to enable a One-Click Authentication.

​
NextAuth

NextAuth is a complete open-source authentication solution for Next.js applications. It is designed from the ground up to support Next.js and Serverless. We can use NextAuth with SIWE to handle users authentication and sessions.

​
Installation

One-Click Auth
Legacy

npm

Yarn

Bun

pnpm

Copy
npm install @reown/appkit-siwe next-auth
​
Configure your SIWE Client

Next.js SIWE Example

Check the Next.js example using NextAuth
One-Click Auth
Legacy

Copy
import { getCsrfToken, signIn, signOut, getSession } from "next-auth/react";
import type {
  SIWEVerifyMessageArgs,
  SIWECreateMessageArgs,
  SIWESession,
} from "@reown/appkit-siwe";
import { createSIWEConfig, formatMessage } from "@reown/appkit-siwe";
import { mainnet, sepolia } from "@reown/appkit/networks";

export const siweConfig = createSIWEConfig({
  getMessageParams: async () => ({
    domain: typeof window !== "undefined" ? window.location.host : "",
    uri: typeof window !== "undefined" ? window.location.origin : "",
    chains: [mainnet.id, sepolia.id],
    statement: "Please sign with your account",
  }),
  createMessage: ({ address, ...args }: SIWECreateMessageArgs) =>
    formatMessage(args, address),
  getNonce: async () => {
    const nonce = await getCsrfToken();
    if (!nonce) {
      throw new Error("Failed to get nonce!");
    }

    return nonce;
  },
  getSession: async () => {
    const session = await getSession();
    if (!session) {
      return null;
    }

    // Validate address and chainId types
    if (
      typeof session.address !== "string" ||
      typeof session.chainId !== "number"
    ) {
      return null;
    }

    return {
      address: session.address,
      chainId: session.chainId,
    } satisfies SIWESession;
  },
  verifyMessage: async ({ message, signature }: SIWEVerifyMessageArgs) => {
    try {
      const success = await signIn("credentials", {
        message,
        redirect: false,
        signature,
        callbackUrl: "/protected",
      });

      return Boolean(success?.ok);
    } catch (error) {
      return false;
    }
  },
  signOut: async () => {
    try {
      await signOut({
        redirect: false,
      });

      return true;
    } catch (error) {
      return false;
    }
  },
});
verifySignature

Verify a SIWE signature.


Copy
import { createPublicClient, http } from "viem";

const publicClient = createPublicClient({
  transport: http(
    `https://rpc.walletconnect.org/v1/?chainId=${chainId}&projectId=${projectId}`
  ),
});
const isValid = await publicClient.verifyMessage({
  message,
  address: address as `0x${string}`,
  signature: signature as `0x${string}`,
});

// The verifySignature is not working with social logins and emails with non deployed smart accounts
// for this reason we recommend using the viem to verify the signature
// import { verifySignature } from '@reown/appkit-siwe'
// const isValid = await verifySignature({ address, message, signature, chainId, projectId })
getChainIdFromMessage

Get the chain ID from the SIWE message.


Copy
import { getChainIdFromMessage } from "@reown/appkit-siwe";

const chainId = getChainIdFromMessage(message);
getAddressFromMessage

Get the address from the SIWE message.


Copy
import { getAddressFromMessage } from "@reown/appkit-siwe";

const address = getAddressFromMessage(message);
​
Set up your API route

Add NEXTAUTH_SECRET as an environment variable, it will be used to encrypt and decrypt user sessions. Learn more.

Create your API route at app/api/auth/[...nextauth]/route.ts.

One-Click Auth
Legacy

Copy
import NextAuth from "next-auth";
import credentialsProvider from "next-auth/providers/credentials";
import {
  type SIWESession,
  verifySignature,
  getChainIdFromMessage,
  getAddressFromMessage,
} from "@reown/appkit-siwe";

declare module "next-auth" {
  interface Session extends SIWESession {
    address: string;
    chainId: number;
  }
}

const nextAuthSecret = process.env.NEXTAUTH_SECRET;
if (!nextAuthSecret) {
  throw new Error("NEXTAUTH_SECRET is not set");
}

const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID;
if (!projectId) {
  throw new Error("NEXT_PUBLIC_PROJECT_ID is not set");
}

const providers = [
  credentialsProvider({
    name: "Ethereum",
    credentials: {
      message: {
        label: "Message",
        type: "text",
        placeholder: "0x0",
      },
      signature: {
        label: "Signature",
        type: "text",
        placeholder: "0x0",
      },
    },
    async authorize(credentials) {
      try {
        if (!credentials?.message) {
          throw new Error("SiweMessage is undefined");
        }
        const { message, signature } = credentials;
        const address = getAddressFromMessage(message);
        const chainId = getChainIdFromMessage(message);

        const isValid = await verifySignature({
          address,
          message,
          signature,
          chainId,
          projectId,
        });

        if (isValid) {
          return {
            id: `${chainId}:${address}`,
          };
        }

        return null;
      } catch (e) {
        return null;
      }
    },
  }),
];

const handler = NextAuth({
  // https://next-auth.js.org/configuration/providers/oauth
  secret: nextAuthSecret,
  providers,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    session({ session, token }) {
      if (!token.sub) {
        return session;
      }

      const [, chainId, address] = token.sub.split(":");
      if (chainId && address) {
        session.address = address;
        session.chainId = parseInt(chainId, 10);
      }

      return session;
    },
  },
});

export { handler as GET, handler as POST };
Learn More

​
Initialize AppKit with your siweConfig.


Copy
// Pass your siweConfig inside the createAppKit() function
const modal = createAppKit({
  adapters: [wagmiAdapter], //or your Ethers adapter
  projectId,
  networks: [mainnet, arbitrum],
  defaultNetwork: mainnet,
  features: {
    analytics: true, // Optional - defaults to your Cloud configuration
  },
  siweConfig: siweConfig, // pass your siweConfig
});
​
SIWE Config reference


Copy
interface SIWEConfig {
  // Required
  getNonce: () => Promise<string>;
  createMessage: (args: SIWECreateMessageArgs) => string;
  verifyMessage: (args: SIWEVerifyMessageArgs) => Promise<boolean>;
  getSession: () => Promise<SIWESession | null>;
  signOut: () => Promise<boolean>;

  // Optional
  onSignIn?: (session?: SIWESession) => void;
  onSignOut?: () => void;
  // Defaults to true
  enabled?: boolean;
  // In milliseconds, defaults to 5 minutes
  nonceRefetchIntervalMs?: number;
  // In milliseconds, defaults to 5 minutes
  sessionRefetchIntervalMs?: number;
  // Defaults to true
  signOutOnDisconnect?: boolean;
  // Defaults to true
  signOutOnAccountChange?: boolean;
  // Defaults to true
  signOutOnNetworkChange?: boolean;
}
​
Required

​
getNonce

The getNonce method functions as a safeguard against spoofing, akin to a CSRF token. The siwe package provides a generateNonce() helper, or you can utilize an existing CSRF token from your backend if available.

​
createMessage

The official siwe package offers a straightforward method for generating an EIP-4361-compatible message, which can subsequently be authenticated using the same package. The nonce parameter is derived from your getNonce endpoint, while the address and chainId variables are sourced from the presently connected wallet.

​
verifyMessage

The verifyMessage method should lean on the siwe package’s new


Copy
SiweMessage(message).validate(signature);
to ensure the message is valid, has not been tampered with, and has been appropriately signed by the wallet address.

​
getSession

The backend session should store the associated address and chainId and return it via the getSession method.

​
signOut

The users session can be destroyed calling signOut.

​
Optional

​
onSignIn (session?: SIWESession) => void

Callback when user signs in.

​
onSignOut () => void

Callback when user signs out.

​
enabled boolean - defaults to true

Whether or not to enable SIWE. Defaults to true.

​
nonceRefetchIntervalMs number - defaults to 300000ms (5 minutes)

How often to refetch the nonce, in milliseconds.

​
sessionRefetchIntervalMs number - defaults to 300000ms (5 minutes)

How often to refetch the session, in milliseconds.

​
signOutOnDisconnect boolean - defaults to true

Whether or not to sign out when the user disconnects their wallet.

​
signOutOnAccountChange boolean - defaults to true

Users will be signed out and redirected to the SIWE view to sign a new message in order to keep the SIWE session in sync with the connected account.

​
signOutOnNetworkChange boolean - defaults to true

Users will be signed out and redirected to the SIWE view to sign a new message in order to keep the SIWE session in sync with the connected account/network.
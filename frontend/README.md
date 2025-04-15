# FRANKY - Custom AI Agent Creator

FRANKY is a Next.js application that allows users to create custom AI agents with DeFi tools integration, powered by the 1inch protocol.

![FRANKY Screenshot](https://via.placeholder.com/800x400?text=FRANKY+AI+Agent+Creator)

## Features

- **Cyberpunk-inspired Design**: Dark theme with neon green accents and animated elements
- **Web3 Authentication**: Connect with Ethereum, Polygon, or Arbitrum wallets
- **Visual Agent Builder**: Drag-and-drop interface for adding tools to your AI agent
- **Custom Prompts**: Fine-tune your agent's behavior with system prompts
- **Chat Interface**: Interact with your created agents in a ChatGPT-style interface

## Tech Stack

- Next.js 14+ with App Router
- TypeScript
- Tailwind CSS
- Framer Motion for animations
- DND Kit for drag-and-drop functionality
- WalletConnect for Web3 authentication

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/franky.git
   cd franky
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory with the following variables:
   ```
   NEXT_PUBLIC_WALLET_CONNECT_ID=your_wallet_connect_project_id
   ```
   
   You can get a WalletConnect Project ID by signing up at [WalletConnect Cloud](https://cloud.walletconnect.com/).

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Setting Up WalletConnect

1. Sign up for an account at [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. Create a new project and get your Project ID
3. Add your Project ID to the `.env.local` file:
   ```
   NEXT_PUBLIC_WALLET_CONNECT_ID=your_project_id
   ```
4. Configure supported chains in `src/lib/walletConfig.ts` if needed

## Usage

### Landing Page

The landing page provides an overview of FRANKY's features and capabilities. Click on "Connect Wallet" to authenticate and "Build Your Agent" to get started.

### Creating an Agent

1. Connect your wallet when prompted
2. Give your agent a name
3. Drag tools from the toolbox to the construction zone
4. Customize the system prompt to define your agent's behavior
5. Click "Create Agent" to finalize

### Chatting with Your Agent

After creating an agent, you'll be redirected to the chat interface where you can interact with your agent. The agent will have access to the tools you selected during creation.

## Project Structure

```
franky/
├── src/
│   ├── app/                  # Next.js App Router pages
│   │   ├── page.tsx          # Landing page
│   │   ├── create-agent/     # Agent creation page
│   │   └── chat/[agentId]/   # Chat interface
│   ├── components/           # React components
│   │   ├── ui/               # UI components
│   │   ├── wallet/           # Wallet connection components
│   │   ├── three/            # Three.js animations
│   │   ├── dnd/              # Drag-and-drop components
│   │   └── chat/             # Chat interface components
│   ├── store/                # Global state management
│   └── lib/                  # Utility functions
└── public/                   # Static assets
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- [1inch Protocol](https://1inch.io/) for DeFi integration
- [Next.js](https://nextjs.org/) for the React framework
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Framer Motion](https://www.framer.com/motion/) for animations
- [DND Kit](https://dndkit.com/) for drag-and-drop functionality
- [WalletConnect](https://walletconnect.com/) for Web3 authentication

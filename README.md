# Franky
Monetize your old devices by powering efficient AI agents.

![image](https://github.com/user-attachments/assets/e903a068-3bea-4c29-9f9c-049ce820ff92)

## Description

Not sure what to do with your OLD mobile? Franky helps you to run Local LLM Inference right in your device and **MONETIZE** your compute with **$FRANKY** tokens. Device Owners could contribute their old devices to run LLMs locally and host AI agents on top of them to earn **$FRANKY** tokens. Agent creators could choose a device of their choice to build their Agent from scratch with it's very own custom characteristics and generate an API key to interact with them. Agents could also be made publicly available by the Agent Creator for others to use them and in-turn earn **$FRANKY** tokens. Agent developers could build plugins in our AI Agent Framework to build custom functionalities. Each Agent has their VERY OWN custom subdomain which makes it readable and convenient to interact with.

## How it's made

The application is built on **Base** and uses **Metal** for token transfers. For real-time data management, we integrated **Nodit’s Web3 Data API**, **Elastic Nodes**, and **Streams**. These technologies allow for the efficient indexing of multi-chain data—such as balances and transaction history—ensuring that users can access this information instantly and without delay. The use of  **Web3 data API** and **Streams** ensure that data updates happen in real-time, providing a highly dynamic and responsive user experience.

**Metal** was useful for us to create the $FRANKY tokens and simplified the ENTIRE transaction flow between Device Providers, Agent Creators and the Platform Owners. An LLM runs locally in the mobile phone and the Agent Framework implemented for Franky Agents is a Fork of the SillyTavern Framework.

Every single agent upon creation has their own ENS name. We do this by minting the DNS Subdomain on **ENS**, thereby making it seamless for users to interact with the agent of their choice.

## Sponsors

### Metal

The Franky Agents ecosystem is driven by $FRANKY tokens, created through Metal, with a liquidity pool also deployed via Metal. When an AI agent is deployed, the deployer pays a hosting fee in $FRANKY to the device owners running the agent and its local LLM. This fee is automatically split between the Franky Merchant Wallet and the Device Owner.

Likewise, when users interact with agents listed on the marketplace, $FRANKY tokens are seamlessly distributed among the Agent Developer, Device Owner, and Merchant. All token flows are fully abstracted from the UI, enabling frictionless, real-time transfers between users, developers, and infrastructure providers.

Thanks to Reown’s built-in swap and on-ramp features, users can instantly convert their earnings to fiat directly within the app.

### Nodit

We have built a fully functional application on Base Mainnet which facilitates to repurpose OLD mobile phones and EARN **$FRANKY** tokens by running local LLM inference and host AI agents in them, providing Affordable Agent compute to everyone

We use Nodit’s Elastic Node, Web3 Data API, Websockets, and Streams to index and display the various data related to Agent Details, Device Information and User Data. This includes list of Agents and Mobile Devices, real-time balances, Wallet Specific Information, and Event Listeners—all rendered with minimal latency and a smooth, clean UX.

Nodit’s developer-first tooling makes it easy to provide a fast, reliable, and highly responsive experience without having to manage complex indexing infrastructure. The result is a lightweight, data-rich Application that brings a **COMPLETELY** decentralized solution.

Thanks to Nodit, users can list their devices, host their agents quickly and arrive at insights WITHOUT any hassle.

### ENS

Our primary domain is a DNS domain—frankyagent.xyz—which we’ve registered as an ENS name and bridged into ENS on Base. For each AI Agent created, we mint a corresponding subdomain as a subname under this ENS domain. Users interact with these Agents by sending POST requests to their respective URLs, such as https://eliza.frankyagent.xyz/chat. We use the Durin Stack to resolve ENS names directly on the Base L2 network, enabling seamless DNS-to-ENS integration and agent communication.

### Metal Line of Code

Tokenization and Wallet Infrastructure - https://github.com/Marshal-AM/franky/blob/main/frontend/src/components/wallet/ReownWalletButton.tsx

Token Balance Management - https://github.com/Marshal-AM/franky/blob/main/frontend/src/app/api/balance/%5BuserId%5D/route.ts

Token Transaction Processing - https://github.com/Marshal-AM/franky/blob/main/frontend/src/app/api/withdraw/%5BuserId%5D/route.ts

Token Data and Holder Info - https://github.com/Marshal-AM/franky/blob/main/frontend/src/app/api/get-holders/route.ts

Hosting AI Agents - 

Franky Faucet - 

Smart Contract Integration - 

API Call Payment - 


### Nodit Line of Code

List All Agents - https://github.com/Marshal-AM/franky/blob/main/indexers/agents/allagents.js

List Agents Owned by a specific Wallet Address - https://github.com/Marshal-AM/franky/blob/main/indexers/agents/walletagent.js

List All Devices - https://github.com/Marshal-AM/franky/blob/main/indexers/device/listalldevice.js

List Devices Owned by an Owner - https://github.com/Marshal-AM/franky/blob/main/indexers/device/walletdevice.js

Websocket Listening to a New Agent Created Event - https://github.com/Marshal-AM/franky/blob/main/indexers/agentcreation.js

Websocket Listening to a New Device Registration Event - https://github.com/Marshal-AM/franky/blob/main/indexers/deviceregistration.js

Websocket for updating the revenue in real-time - https://github.com/Marshal-AM/franky/blob/main/indexers/liverevenue.js

Websocket Listening to Token Transfer Events - https://github.com/Marshal-AM/franky/blob/main/indexers/transfers.js

Agent Information in frontend - https://github.com/Marshal-AM/franky/blob/main/frontend/src/middleware.ts

Agent Dashboard data - https://github.com/Marshal-AM/franky/blob/main/frontend/src/app/dashboard/agents/page.tsx

Devices Dashboard data - https://github.com/Marshal-AM/franky/blob/main/frontend/src/app/dashboard/devices/page.tsx

Marketplace Data Fetch - https://github.com/Marshal-AM/franky/blob/main/frontend/src/app/agent-marketplace/page.tsx


### ENS Line of Code

Agent Subdomains - https://github.com/Marshal-AM/franky/blob/main/frontend/src/lib/ens.ts

Middleware Routing - https://github.com/Marshal-AM/franky/blob/main/frontend/src/middleware.ts

Agent Creation - https://github.com/Marshal-AM/franky/blob/main/frontend/src/app/create-agent/page.tsx

ENS Testing - https://github.com/Marshal-AM/franky/blob/main/testing/ens.ts


### Metal Feedback

It would be nice to have an API endpoint that would batch multiple transfer actions in one API call. Building react hooks, or react sdks would really be good DevX.

### Nodit Feedback

Super easy to use and integrate but Webhooks and Websockets possess a latency which could be reduced. Under Websockets, LOGs could facilitate listening to various topics in multiple events instead of looking for a bunch of topics under the same event in an address. Nodit only indexes subnames in Ethereum Mainnet, it does not resolve or fetch subnames minted on L2 using Durin. This made it challenging to use Nodit ENS API for our use case.

### ENS Feedback

Integration was super easy and the indexing was fast. But we had issues with fetching all the text records from the ENS names in the client side. Indexer solutions like Nodit only indexes subnames in Ethereum Mainnet, it does not resolve the L2 subname.

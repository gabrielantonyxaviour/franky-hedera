# Franky
Monetize your old devices by powering efficient AI agents.

![image](https://github.com/user-attachments/assets/e903a068-3bea-4c29-9f9c-049ce820ff92)

## Description

Not sure what to do with your OLD mobile? Franky helps you to run Local LLM Inference right in your device and **MONETIZE** your compute with **$FRANKY** tokens. Device Owners could contribute their old devices to run LLMs locally and host AI agents on top of them to earn **$FRANKY** tokens. Agent creators could choose a device of their choice to build their Agent from scratch with it's very own custom characteristics and generate an API key to interact with them. Agents could also be made publicly available by the Agent Creator for others to use them and in-turn earn **$FRANKY** tokens. Agent developers could build plugins in our AI Agent Framework to build custom functionalities. Each Agent has their VERY OWN custom subdomain which makes it readable and convenient to interact with.
## How it's made

The app is built on **WorldChain Sepolia** and leverages **Hyperlane Interchain Accounts (ICA)** and the **Open Intents framework** to facilitate seamless cross-chain transactions. World ID–verified users have identity-linked smart accounts that allow them to interact with multiple blockchains through a single interface, streamlining the cross-chain process.

For real-time data management, I integrated **Nodit’s Web3 Data API**, **Elastic Nodes**, **Webhooks**, and **Streams**. These technologies allow for the efficient indexing of multi-chain data—such as balances and transaction history—ensuring that users can access this information instantly and without delay. The use of **Elastic Nodes** helps to handle complex queries, while **Webhooks** and **Streams** ensure that data updates happen in real-time, providing a highly dynamic and responsive user experience.

By combining **Hyperlane’s** cross-chain messaging, **Open Intents’** secure transaction execution, and **Nodit’s** powerful data indexing tools, the Mini App offers a robust, scalable solution for cross-chain interactions. This technology stack allows the app to deliver live, fast data access across multiple blockchains, making it simple for users to manage their assets and perform transactions in a seamless, unified interface.

## Sponsors

### WorldChain

I’ve built a fully functional Mini App on WorldChain Sepolia that extends the ERC-7683 Open Intents Account with Hyperlane Interchain Accounts.

With this integration, users can bridge assets across 140+ EVM chains and even send arbitrary transactions. For example, a user verified via World ID on WorldChain can now send a gasless transaction on Arbitrum—or any supported chain—directly from within a Mini App using Quick Actions.

This unlocks a powerful new paradigm for building World Apps on WorldChain, where users can interact with any EVM chain from a single interface—without needing separate on-chain verification on each destination chain. This not only saves significant gas fees but also bypasses the need for native zk verification, which many chains (including some in the EVM, Solana, and Cosmos ecosystems) don’t support.

With this implementation, World ID users can now send human-verified transactions on any blockchain.

Moreover, this opens the door for EVM applications to leverage human-verified accounts, making it effortless to port apps like decentralized games, DAOs, NFT marketplaces, and more into the World Mini Apps effortlessly!

And thanks to the Open Intents framework, any dApp can choose to sponsor gas fees for human-verified users simply by submitting a pull request to the intent solver—making onboarding and adoption even smoother.

### Nodit

We have built a fully functional application on Base Mainnet which facilitates to repurpose OLD mobile phones and EARN **$FRANKY** tokens by running local LLM inference and host AI agents in them, providing Affordable Agent compute to everyone

We use Nodit’s Elastic Node, Web3 Data API, Websockets, and Streams to index and display the various data related to Agent Details, Device Information and User Data. This includes list of Agents and Mobile Devices, real-time balances, Wallet Specific Information, and Event Listeners—all rendered with minimal latency and a smooth, clean UX.

Nodit’s developer-first tooling makes it easy to provide a fast, reliable, and highly responsive experience without having to manage complex indexing infrastructure. The result is a lightweight, data-rich Application that brings a **COMPLETELY** decentralized solution.

Thanks to Nodit, users can list their devices, host their agents quickly and arrive at insights WITHOUT any hassle.

### Hyperlane

I’ve built a Mini App on WorldChain Sepolia that extends the ERC-7683 Open Intents Account with Hyperlane Interchain Accounts. Each smart account created by a World ID–verified user is a Hyperlane ICA, allowing them to bridge assets and send arbitrary transactions across 140+ EVM chains.

This goes beyond standard Open Intents usage—every World ID user owns an interchain smart account that can act on any chain. I’ve made custom modifications to the Open Intents framework to support this World ID–controlled architecture.

Verified users can now send gasless transactions on chains like Arbitrum from within the Mini App using Quick Actions, without needing on-chain verification contracts on other chains. This saves gas, avoids zk compatibility issues, and enables human-verified transactions on any blockchain.

EVM apps can now integrate with these verified accounts easily, making it simple to port games, DAOs, and marketplaces into World Mini Apps. Thanks to Open Intents, dApps can sponsor transactions for verified users with just a pull request to the solver—offering seamless, scalable onboarding.

### WorldCoin Line of Code

https://github.com/gabrielantonyxaviour/bombardiro-crocodilo/blob/main/README.md#world-line-of-code

### Nodit Line of Code

https://github.com/gabrielantonyxaviour/bombardiro-crocodilo/blob/main/README.md#nodit-line-of-code

### Hyperlane Line of Code

https://github.com/gabrielantonyxaviour/bombardiro-crocodilo/blob/main/README.md#hyperlane-line-of-code

### WorldCoin Feedback

Super easy to use and integrate. I have added my feedback here.

https://github.com/gabrielantonyxaviour/bombardiro-crocodilo/blob/main/README.md#world-feedback

### Nodit Feedback

Super easy to use and integrate. Webhooks and Websockets possess a latency which could be reduced
Under Websockets, LOGs could facilitate listening to various topics in multiple events instead of looking for a bunch of topics under the same event in an address

https://github.com/gabrielantonyxaviour/bombardiro-crocodilo/blob/main/README.md#nodit-feedback

### Hyperlane Feedback

Super easy to use and integrate. I have added my feedback here.

https://github.com/gabrielantonyxaviour/bombardiro-crocodilo/blob/main/README.md#hyperlane-feedback

This is my 3rd year aniversary building on Hyperlane. It was the first sponsor I built on for an ETHGlobal Hackathon. Super glad to keep build new things on Hyperlane.

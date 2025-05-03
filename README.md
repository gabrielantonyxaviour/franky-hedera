# Franky
FrankyAgent is a decentralized framework for deploying and monetizing local AI agents running directly on user devices (e.g. phones). It enables on-device inference using lightweight LLMs, tracks agent performance through a private Hedera Consensus Service, and incentivizes high-uptime nodes using $HBAR. Agent ownership is recorded using NFTs minted via the Hedera Token Service.
🧠 Key Features
♻️ Local LLM on Phones
Each device runs a lightweight agent using the Hedera Agent Kit for on-device inference and integration with Hedera services.
📡 Private Consensus Service for Validation
Devices publish their uptime, latency, and behavior metrics to a self-hosted Consensus Service on Hedera, enabling efficient and verifiable performance tracking.
Hedera's HCS-10 standard is used exclusively for agent interaction and communication.
🧾 On-Chain Reputation
Each device signs its telemetry and pushes updates to its own topic within the private consensus layer.
Any participant can subscribe, verify signatures, and compute performance scores.
💰 Incentives via $HBAR
Rewards are distributed in $HBAR, Hedera's native currency.
Devices are ranked based on uptime and responsiveness, and periodic payouts are issued accordingly.
🪪 Agent Ownership via NFT
Each deployed agent is linked to an NFT minted through the Hedera Token Service, proving authorship and enabling agent transferability.
🌐 Agent Subdomains
Every deployed agent is assigned a human-readable subdomain like kai.frankyagent.xyz.
Agent creators earn passive $HBAR income when their agent is used or deployed on other devices.
🔁 Flow Overview
Device Initialization:
A user sets up a FrankyAgent node on their phone. The node generates its keypair and topic ID.
Telemetry Broadcasting:
The node signs and broadcasts telemetry to its own topic on the private Hedera Consensus Service.
Peer Subscription & Validation:
Other nodes subscribe to topics, validate telemetry, and can flag abnormal behavior.
Reputation Scoring:
A score is calculated based on uptime, latency, and peer verification.
HBAR Incentives:
Periodic rewards in $HBAR are distributed based on performance tiers.
Agent Deployment:
Developers mint an NFT representing their agent. Others can deploy these agents and generate passive income for the creator.
🔒 Privacy & Security
All telemetry is signed by the device.
Users control whether to expose logs publicly.
Hedera Consensus Service provides timestamped, immutable logs without revealing sensitive data.
🌍 Use Cases
Decentralized AI assistant grids.
Local inference marketplace.
Agent reputation leaderboards.
Bot farms with on-chain telemetry.
Incentivized compute networks.
📦 Technologies Used
Hedera Agent Kit – On-device agent framework.
Ollama – Lightweight LLM inference engine.
Hedera Consensus Service – Private telemetry + agent messaging.
HCS-10 – Agent communication format.
Hedera Token Service – Agent ownership via NFT and $HBAR-based incentives.
🔮 Roadmap
🧠 Device Swarms
Allow FrankyAgent nodes to form dynamic swarms for distributed task coordination, data collection, or inference.
🔁 On/Off Ramps for $HBAR
Integrate fiat and crypto on/off ramps to enable seamless participation and $HBAR rewards redemption.
🧰 Agent Framework Extensions
Support legacy and emerging agent frameworks like ELIZA, Zerebro, and others alongside the Hedera Agent Kit.
📊 Graph-Based Reputation Explorer
Public dashboard for visualizing agent/device performance based on on-chain metrics.

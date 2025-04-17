# DeFi Deployment for Zircuit and Flow EVM Testnets

This project contains the necessary contracts and scripts to deploy a DeFi setup on Zircuit and Flow EVM Testnets, including:

- Token Factory for creating ERC20 tokens
- Multiple ERC20 tokens (WBTC, WETH, WSOL, USDT)
- Pairs creation and liquidity provisioning with UniswapV2
- Token minting functionality

## Prerequisites

- Node.js (v16+)
- npm or yarn
- MetaMask or another wallet with testnet tokens

## Setup

1. Clone the repository:

```bash
git clone https://github.com/gabrielantonyxaviour/defius-maximus
cd contracts
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory with the following content:

```
PRIVATE_KEY=your_private_key_here
ZIRCUIT_RPC_URL=https://rpc-testnet.zircuit.com
FLOW_EVM_RPC_URL=https://evm-testnet.flow.org
ZIRCUIT_API_KEY=your_zircuit_api_key_here
FLOW_API_KEY=your_flow_api_key_here
UNISWAP_FACTORY_ADDRESS=your_uniswap_factory_address
UNISWAP_ROUTER_ADDRESS=your_uniswap_router_address
```

## Deployment

The deployment process is split into several scripts to be run in sequence:

### 1. Deploy TokenFactory and WETH

```bash
npx hardhat run scripts/01-deploy-factory.js --network zircuit
```

This script deploys:

- TokenFactory contract
- WETH (Wrapped ETH) contract

It saves the deployment information to `deployments/zircuit-deployment.json`.

### 2. Deploy ERC20 Tokens

```bash
npx hardhat run scripts/02-deploy-tokens.js --network zircuit
```

This script creates:

- WBTC (Wrapped Bitcoin)
- WSOL (Wrapped Solana)
- USDT (USD Tether)

### 3. Setup Pairs and Add Liquidity

```bash
export UNISWAP_FACTORY_ADDRESS=your_factory_address
export UNISWAP_ROUTER_ADDRESS=your_router_address
npx hardhat run scripts/03-setup-pairs.js --network zircuit
```

This script:

- Creates trading pairs between tokens and USDT
- Adds initial liquidity to these pairs
- Performs a test swap

### 4. Mint Additional Tokens

```bash
npx hardhat run scripts/04-mint-tokens.js --network zircuit
```

This script mints additional tokens to the deployer address.

### 5. Verify Contracts

```bash
npx hardhat run scripts/05-verify-contracts.js --network zircuit
```

This script verifies all deployed contracts on the blockchain explorer.

## Token Contracts

The project includes the following token implementations:

1. `Token.sol` - A standard ERC20 token with minting capabilities
2. `WETH.sol` - A wrapped ETH implementation
3. `TokenFactory.sol` - A factory contract for creating new tokens

## Network Configuration

The hardhat.config.js file includes configurations for:

- Zircuit Testnet
- Flow EVM Testnet

## Interacting with Contracts

After deployment, you can interact with these contracts using:

1. Frontend applications
2. Hardhat scripts
3. Block explorers

## Testing

Run tests with:

```bash
npx hardhat test
```

## License

MIT

import { ContractId, AccountId } from "@hashgraph/sdk";
import { TokenId } from "@hashgraph/sdk";
import { ethers } from "ethers";
import { useContext, useEffect } from "react";
import { appConfig } from "../config";
import { MetamaskContext } from "../context/metamask";
import { ContractFunctionParameterBuilder } from "../utils/param-builder";
import { WalletInterface } from "../types/wallet-interface";

const currentNetworkConfig = appConfig.networks.testnet;

export const switchToHederaNetwork = async (ethereum: any) => {
    try {
        await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: currentNetworkConfig.chainId }]
        });
    } catch (error: any) {
        if (error.code === 4902) {
            try {
                await ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [
                        {
                            chainName: `Hedera (${currentNetworkConfig.network})`,
                            chainId: currentNetworkConfig.chainId,
                            nativeCurrency: {
                                name: 'HBAR',
                                symbol: 'HBAR',
                                decimals: 18
                            },
                            rpcUrls: [currentNetworkConfig.jsonRpcUrl]
                        },
                    ],
                });
            } catch (addError) {
                console.error(addError);
            }
        }
        console.error(error);
    }
}

const getProvider = () => {
    if (typeof window === "undefined") {
        return null;
    }

    if (!window.ethereum) {
        throw new Error("Metamask is not installed! Go install the extension!");
    }

    return new ethers.providers.Web3Provider(window.ethereum);
}

export const connectToMetamask = async () => {
    const provider = getProvider();
    if (!provider) {
        throw new Error("Provider not available");
    }

    let accounts: string[] = []

    try {
        if (typeof window !== "undefined" && window.ethereum) {
            await switchToHederaNetwork(window.ethereum);
            accounts = await provider.send("eth_requestAccounts", []);
        }
    } catch (error: any) {
        if (error.code === 4001) {
            console.warn("Please connect to Metamask.");
        } else {
            console.error(error);
        }
    }

    return accounts;
}

class MetaMaskWallet implements WalletInterface {
    private convertAccountIdToSolidityAddress(accountId: AccountId): string {
        const accountIdString = accountId.evmAddress !== null
            ? accountId.evmAddress.toString()
            : accountId.toSolidityAddress();

        return `0x${accountIdString}`;
    }

    async transferHBAR(toAddress: AccountId, amount: number) {
        const provider = getProvider();
        if (!provider) {
            throw new Error("Provider not available");
        }

        const signer = await provider.getSigner();

        const tx = await signer.populateTransaction({
            to: this.convertAccountIdToSolidityAddress(toAddress),
            value: ethers.utils.parseEther(amount.toString()),
        });

        try {
            const { hash } = await signer.sendTransaction(tx);
            await provider.waitForTransaction(hash);
            return hash;
        } catch (error: any) {
            console.warn(error.message || error);
            return null;
        }
    }

    async transferFungibleToken(toAddress: AccountId, tokenId: TokenId, amount: number) {
        return await this.executeContractFunction(
            ContractId.fromString(tokenId.toString()),
            'transfer',
            new ContractFunctionParameterBuilder()
                .addParam({
                    type: "address",
                    name: "recipient",
                    value: this.convertAccountIdToSolidityAddress(toAddress)
                })
                .addParam({
                    type: "uint256",
                    name: "amount",
                    value: amount
                }),
            appConfig.constants.METAMASK_GAS_LIMIT_TRANSFER_FT
        );
    }

    async transferNonFungibleToken(toAddress: AccountId, tokenId: TokenId, serialNumber: number) {
        const provider = getProvider();
        if (!provider) {
            throw new Error("Provider not available");
        }

        const addresses = await provider.listAccounts();

        return await this.executeContractFunction(
            ContractId.fromString(tokenId.toString()),
            'transferFrom',
            new ContractFunctionParameterBuilder()
                .addParam({ type: "address", name: "from", value: addresses[0] })
                .addParam({ type: "address", name: "to", value: this.convertAccountIdToSolidityAddress(toAddress) })
                .addParam({ type: "uint256", name: "nftId", value: serialNumber }),
            appConfig.constants.METAMASK_GAS_LIMIT_TRANSFER_NFT
        );
    }

    async associateToken(tokenId: TokenId) {
        return await this.executeContractFunction(
            ContractId.fromString(tokenId.toString()),
            'associate',
            new ContractFunctionParameterBuilder(),
            appConfig.constants.METAMASK_GAS_LIMIT_ASSOCIATE
        );
    }

    async executeContractFunction(contractId: ContractId, functionName: string, functionParameters: ContractFunctionParameterBuilder, gasLimit: number) {
        const provider = getProvider();
        if (!provider) {
            throw new Error("Provider not available");
        }

        const signer = await provider.getSigner();
        const abi = [`function ${functionName}(${functionParameters.buildAbiFunctionParams()})`];

        const contract = new ethers.Contract(`0x${contractId.toSolidityAddress()}`, abi, signer);
        try {
            const txResult = await contract[functionName](
                ...functionParameters.buildEthersParams(),
                { gasLimit: gasLimit === -1 ? undefined : gasLimit }
            );
            return txResult.hash;
        } catch (error: any) {
            console.warn(error.message || error);
            return null;
        }
    }

    disconnect() {
        if (typeof window !== "undefined") {
            alert("Please disconnect using the Metamask extension.");
        }
    }
}

export const metamaskWallet = new MetaMaskWallet();

export const MetaMaskClient = () => {
    const { setMetamaskAccountAddress } = useContext(MetamaskContext);

    useEffect(() => {
        // Check if we're in the browser
        if (typeof window === "undefined" || !window.ethereum) return;

        const ethereum = window.ethereum;
        const provider = new ethers.providers.Web3Provider(ethereum);

        provider.listAccounts().then((accounts) => {
            setMetamaskAccountAddress(accounts.length > 0 ? accounts[0] : "");
        });

        const handleAccountsChanged = (accounts: string[]) => {
            setMetamaskAccountAddress(accounts.length > 0 ? accounts[0] : "");
        };

        ethereum.on("accountsChanged", handleAccountsChanged);

        return () => {
            ethereum.removeListener("accountsChanged", handleAccountsChanged);
        };
    }, [setMetamaskAccountAddress]);

    return null;
};
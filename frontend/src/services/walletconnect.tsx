import { WalletConnectContext } from "../context/walletconnect";
import { useCallback, useContext, useEffect } from 'react';
import { WalletInterface } from "../types/wallet-interface";
import { AccountId, ContractExecuteTransaction, ContractId, LedgerId, TokenAssociateTransaction, TokenId, Transaction, TransactionId, TransferTransaction, Client } from "@hashgraph/sdk";
import { ContractFunctionParameterBuilder } from "../utils/param-builder";
import { appConfig } from "../config";
import { SignClientTypes } from "@walletconnect/types";
import { DAppConnector, HederaJsonRpcMethod, HederaSessionEvent, HederaChainId, SignAndExecuteTransactionParams, transactionToBase64String } from "@hashgraph/hedera-wallet-connect";
import EventEmitter from "events";

// Created refreshEvent because `dappConnector.walletConnectClient.on(eventName, syncWithWalletConnectContext)` would not call syncWithWalletConnectContext
// Reference usage from walletconnect implementation https://github.com/hashgraph/hedera-wallet-connect/blob/main/src/lib/dapp/index.ts#L120C1-L124C9
const refreshEvent = new EventEmitter();

// Create a new project in walletconnect cloud to generate a project id
const walletConnectProjectId = "377d75bb6f86a2ffd427d032ff6ea7d3";
const currentNetworkConfig = appConfig.networks.testnet;
const hederaNetwork = currentNetworkConfig.network;
const hederaClient = Client.forName(hederaNetwork);

// Create getter functions instead of module-level variables that access window
const getMetadata = (): SignClientTypes.Metadata => ({
    name: "Hedera CRA Template",
    description: "Hedera CRA Template",
    url: typeof window !== 'undefined' ? window.location.origin : '',
    icons: [typeof window !== 'undefined' ? window.location.origin + "/logo192.png" : ''],
});

// Lazy initialization of DAppConnector
let dappConnectorInstance: DAppConnector | null = null;

const getDappConnector = () => {
    if (typeof window === 'undefined') {
        return null;
    }

    return new DAppConnector(
        getMetadata(),
        LedgerId.fromString(hederaNetwork),
        walletConnectProjectId,
        Object.values(HederaJsonRpcMethod),
        [HederaSessionEvent.ChainChanged, HederaSessionEvent.AccountsChanged],
        [HederaChainId.Testnet],
    );
};

// Get singleton instance of DAppConnector
const getDappConnectorInstance = () => {
    if (typeof window === 'undefined') {
        return null;
    }

    if (!dappConnectorInstance) {
        dappConnectorInstance = getDappConnector();
    }

    return dappConnectorInstance;
};

// ensure walletconnect is initialized only once
let walletConnectInitPromise: Promise<void> | undefined = undefined;
const initializeWalletConnect = async () => {
    const dappConnector = getDappConnectorInstance();
    if (!dappConnector) {
        throw new Error("DAppConnector not available");
    }

    if (walletConnectInitPromise === undefined) {
        walletConnectInitPromise = dappConnector.init();
    }
    await walletConnectInitPromise;
};

export const openWalletConnectModal = async () => {
    await initializeWalletConnect();
    const dappConnector = getDappConnectorInstance();
    if (!dappConnector) {
        throw new Error("DAppConnector not available");
    }

    await dappConnector.openModal().then(() => {
        refreshEvent.emit("sync");
    });
};

class WalletConnectWallet implements WalletInterface {
    private getSigner() {
        const dappConnector = getDappConnectorInstance();
        if (!dappConnector || dappConnector.signers.length === 0) {
            throw new Error('No signers found!');
        }
        return dappConnector.signers[0];
    }

    private getAccountId() {
        // Need to convert from walletconnect's AccountId to hashgraph/sdk's AccountId because walletconnect's AccountId and hashgraph/sdk's AccountId are not the same!
        return AccountId.fromString(this.getSigner().getAccountId().toString());
    }

    async transferHBAR(toAddress: AccountId, amount: number) {
        const transferHBARTransaction = new TransferTransaction()
            .addHbarTransfer(this.getAccountId(), -amount)
            .addHbarTransfer(toAddress, amount);

        const signer = this.getSigner();
        await transferHBARTransaction.freezeWithSigner(signer);
        const txResult = await transferHBARTransaction.executeWithSigner(signer);
        return txResult ? txResult.transactionId : null;
    }

    async transferFungibleToken(toAddress: AccountId, tokenId: TokenId, amount: number) {
        const transferTokenTransaction = new TransferTransaction()
            .addTokenTransfer(tokenId, this.getAccountId(), -amount)
            .addTokenTransfer(tokenId, toAddress.toString(), amount);

        const signer = this.getSigner();
        await transferTokenTransaction.freezeWithSigner(signer);
        const txResult = await transferTokenTransaction.executeWithSigner(signer);
        return txResult ? txResult.transactionId : null;
    }

    async transferNonFungibleToken(toAddress: AccountId, tokenId: TokenId, serialNumber: number) {
        const transferTokenTransaction = new TransferTransaction()
            .addNftTransfer(tokenId, serialNumber, this.getAccountId(), toAddress);

        const signer = this.getSigner();
        await transferTokenTransaction.freezeWithSigner(signer);
        const txResult = await transferTokenTransaction.executeWithSigner(signer);
        return txResult ? txResult.transactionId : null;
    }

    async associateToken(tokenId: TokenId) {
        const associateTokenTransaction = new TokenAssociateTransaction()
            .setAccountId(this.getAccountId())
            .setTokenIds([tokenId]);

        const signer = this.getSigner();
        await associateTokenTransaction.freezeWithSigner(signer);
        const txResult = await associateTokenTransaction.executeWithSigner(signer);
        return txResult ? txResult.transactionId : null;
    }

    // Purpose: build contract execute transaction and send to wallet for signing and execution
    // Returns: Promise<TransactionId | null>
    async executeContractFunction(contractId: ContractId, functionName: string, functionParameters: ContractFunctionParameterBuilder, gasLimit: number) {
        const tx = new ContractExecuteTransaction()
            .setContractId(contractId)
            .setGas(gasLimit)
            .setFunction(functionName, functionParameters.buildHAPIParams());

        const signer = this.getSigner();
        await tx.freezeWithSigner(signer);
        const txResult = await tx.executeWithSigner(signer);

        // in order to read the contract call results, you will need to query the contract call's results form a mirror node using the transaction id
        // after getting the contract call results, use ethers and abi.decode to decode the call_result
        return txResult ? txResult.transactionId : null;
    }

    disconnect() {
        const dappConnector = getDappConnectorInstance();
        if (dappConnector) {
            dappConnector.disconnectAll().then(() => {
                refreshEvent.emit("sync");
            });
        }
    }
};

export const walletConnectWallet = new WalletConnectWallet();

// this component will sync the walletconnect state with the context
export const WalletConnectClient = () => {
    // use the HashpackContext to keep track of the hashpack account and connection
    const { setAccountId, setIsConnected } = useContext(WalletConnectContext);

    // sync the walletconnect state with the context
    const syncWithWalletConnectContext = useCallback(() => {
        const dappConnector = getDappConnectorInstance();
        if (!dappConnector) {
            return;
        }

        const accountId = dappConnector.signers[0]?.getAccountId()?.toString();
        if (accountId) {
            setAccountId(accountId);
            setIsConnected(true);
        } else {
            setAccountId('');
            setIsConnected(false);
        }
    }, [setAccountId, setIsConnected]);

    useEffect(() => {
        // Sync after walletconnect finishes initializing
        refreshEvent.addListener("sync", syncWithWalletConnectContext);

        if (typeof window !== 'undefined') {
            initializeWalletConnect().then(() => {
                syncWithWalletConnectContext();
            }).catch(console.error);
        }

        return () => {
            refreshEvent.removeListener("sync", syncWithWalletConnectContext);
        }
    }, [syncWithWalletConnectContext]);

    return null;
};
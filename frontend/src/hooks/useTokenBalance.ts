import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi'; // Assuming you're using wagmi for wallet connection

interface TokenBalance {
    id: string;
    address: string;
    balance: number;
    usdValue: number;
    tokenSymbol: string;
    tokenName: string;
}

export function useTokenBalance() {
    const { address: walletAddress, isConnected } = useAccount();
    const [balance, setBalance] = useState<TokenBalance | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchBalance = async () => {
        if (!isConnected || !walletAddress) {
            setBalance(null);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/holder/current?address=${walletAddress}`);

            if (!response.ok) {
                throw new Error('Failed to fetch balance');
            }

            const data = await response.json();
            setBalance(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setBalance(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBalance();
    }, [walletAddress, isConnected]);

    return {
        balance,
        isLoading,
        error,
        refetch: fetchBalance
    };
} 
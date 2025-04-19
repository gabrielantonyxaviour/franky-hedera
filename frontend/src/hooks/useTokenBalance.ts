import { usePrivy } from '@privy-io/react-auth';
import { useState, useEffect } from 'react';

interface TokenBalance {
    id: string;
    address: string;
    balance: number;
    usdValue: number;
    tokenSymbol: string;
    tokenName: string;
}

export function useTokenBalance() {
    const { user } = usePrivy()
    const [balance, setBalance] = useState<TokenBalance | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchBalance = async () => {
        if (!user || !user.smartWallet) {
            setBalance(null);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/holder/current?address=${user.smartWallet.address}`);

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
    }, [user]);

    return {
        balance,
        isLoading,
        error,
        refetch: fetchBalance
    };
} 
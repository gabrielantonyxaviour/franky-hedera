import { useTokenBalance } from '@/hooks/useTokenBalance';

export function TokenBalance() {
    const { balance, isLoading, error } = useTokenBalance();

    if (isLoading) {
        return <div>Loading balance...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    if (!balance) {
        return <div>Connect your wallet to view balance</div>;
    }

    return (
        <div className="p-4 rounded-lg bg-white shadow-sm">
            <h3 className="text-lg font-semibold mb-2">{balance.tokenName} Balance</h3>
            <div className="space-y-2">
                <p className="text-2xl font-bold">
                    {balance.balance.toLocaleString()} {balance.tokenSymbol}
                </p>
                <p className="text-gray-600">
                    ≈ ${balance.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
            </div>
        </div>
    );
} 
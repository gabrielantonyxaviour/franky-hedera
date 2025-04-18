interface MetalTokenHolder {
    id: string;
    address: string;
    balance: number;
    value: number;
}

interface MetalToken {
    id: string;
    address: string;
    name: string;
    symbol: string;
    totalSupply: number;
    startingAppSupply: number;
    remainingAppSupply: number;
    merchantSupply: number;
    merchantAddress: string;
    price: number;
    holders: MetalTokenHolder[];
}

interface Token {
    id: string;
    address: string;
    name: string;
    symbol: string;
    balance: number;
    value: number;
}

export type MetalGetHoldersReturnData = MetalToken;

export type MetalHolderReturnData = {
    success: boolean;
    id: string;
    address: string;
    totalValue: number;
    tokens: Token[];
};
import { PrivyClient } from '@privy-io/server-auth';
import dotenv from "dotenv"
dotenv.config()

async function main() {
    // Initialize your Privy client
    const privy = new PrivyClient(process.env.APP_ID as string, process.env.APP_SECRET as string);

    // Create a server wallet
    const { id: walletId, address, chainType } = await privy.walletApi.create({ chainType: 'ethereum' });
    console.log("Wallet ID:", walletId);
    console.log("Wallet Address:", address);
    console.log("Chain Type:", chainType);
}

main()
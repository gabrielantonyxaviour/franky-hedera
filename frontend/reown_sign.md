How to Sign Messages, Send Transactions, and Get Balance in EVM using AppKit with Wagmi
Learn how to use Reown AppKit for essential wallet functionalities such as signing messages, sending transactions, and retrieving wallet balances.

In this recipe, you will learn how to:

Retrieve the balance of the connected wallet.
Sign a message using a connected wallet.
Send a transaction to the EVM blockchain.
This guide takes approximately 20 minutes to complete.

Let’s dive in!


​
Prerequisites

A fundamental understanding of JavaScript and React.
A minimal installation of AppKit in React.
Obtain a new project Id on Reown Cloud at https://cloud.reown.com
​
Final project

Appkit wagmi Example with blockchain interactions

Download the full project to try it directly on your computer.
​
AppKit Minimal Installation

You can start a small project following the guidelines from our installation React docs using Wagmi

​
Start building

In this guide we are going to use the library Wagmi to make the calls to the blockchain and to interact with the wallet.

​
Get Balance

Fetching a user’s balance is straightforward using the useBalance hook from wagmi.

Start by importing the useBalance hook, the AppKit hook to get the account information and the Address type.

Copy
import { useBalance } from "wagmi";
import { useAppKitAccount } from "@reown/appkit/react";
import { type Address } from "viem";
Use the useAppKitAccount hook to retrieve the user’s address and check if they are connected. Also call the useBalance hook.

Copy
// AppKit hook to get the address and check if the user is connected
const { address, isConnected } = useAppKitAccount()

// Call the useBalance hook with the user's address to prepare for fetching the balance.
const { refetch } = useBalance({
    address: address as Address
});

Create a function to fetch and display (in console) the balance when triggered

Copy
// function to get the balance
const handleGetBalance = async () => {
  const balance = await refetch();
  console.log(
    `${balance?.data?.value.toString()} ${balance?.data?.symbol.toString()}`
  );
};
Finally, in order to call the function you can show the button in a component when isConnected is true

Copy
return (
  isConnected && (
    <div>
      <button onClick={getBalance}>Get Balance</button>
    </div>
  )
);
​
Sign a message

In order to raise the modal to sign a message with your wallet. You can follow these steps:

Start by importing the useSignMessage hook.

Copy
import { useSignMessage } from "wagmi";
Extract the signMessageAsync function from the useSignMessage hook. This function allows you to prompt the connected wallet to sign a specific message. Also get the address and isConnected as explain before.

Copy
// Wagmi hook to sign a message
const { signMessageAsync } = useSignMessage();

// AppKit hook to get the address and check if the user is connected
const { address, isConnected } = useAppKitAccount();
Generate the function to raise the modal to sign the message

Copy
// function to sing a msg
const handleSignMsg = async () => {
    // message to sign
    const msg = "Hello Reown AppKit!"
    const sig = await signMessageAsync({ message: msg, account: address as Address });
}
Finally, in order to call the function:

Copy
return (
  isConnected && (
    <div>
      <button onClick={handleSignMsg}>Sign Message</button>
    </div>
  )
);
​
Send a transaction in EVM

In order to raise the modal to sign and send a transaction with your wallet. You can follow these steps:

Start by importing useEstimateGas and useSendTransaction hooks.

Copy
import { useEstimateGas, useSendTransaction } from "wagmi";
import { parseGwei, type Address } from "viem";
Use the useEstimateGas hook to calculate the gas required for the transaction, then proceed to send the transaction and get the user’s connection status with the provided hooks.

Copy

// test transaction
const TEST_TX = {
  to: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045" as Address, // vitalik address
  value: parseGwei('0.0001')
}

 // Wagmi hook to estimate gas
const { data: gas } = useEstimateGas({...TEST_TX});

// Wagmi hook to send a transaction
const { data: hash, sendTransaction, } = useSendTransaction();

// AppKit hook to check if the user is connected
const { isConnected } = useAppKitAccount()
Generate the function to raise the modal to send the transaction

Copy
// function to send a TX
const handleSendTx = () => {
  try {
    sendTransaction({
      ...TEST_TX,
      gas, // Add the gas to the transaction
    });
  } catch (err) {
    console.log("Error sending transaction:", err);
  }
};
Finally, in order to call the function:

Copy
return (
  isConnected && (
    <div>
      <button onClick={handleSendTx}>Send Transaction</button>
    </div>
  )
);
​
Conclusion

By following this guide, you’ve learned how to integrate Reown AppKit and Wagmi in your React application to perform essential wallet operations. You can now fetch wallet balances, sign messages, and send transactions seamlessly in an EVM-compatible blockchain environment.

Keep exploring AppKit to enhance your dApp’s functionality and user experience!
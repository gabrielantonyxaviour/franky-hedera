"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useWalletInterface } from '@/hooks/use-wallet-interface';
import { useEffect, useRef, useState } from "react";
import { LogOut, User, UserCircle } from "lucide-react";
import { faucetWalletClient, publicClient, shortenAddress } from "@/lib/utils";
import { formatEther, Hex, parseEther, stringToBytes, zeroAddress } from "viem";
import { FRANKY_ABI, FRANKY_ADDRESS, FRANKY_CONTRACT_ID } from "@/lib/constants";
import { toast } from "sonner"
import { generatePrivateKey, privateKeyToAddress } from "viem/accounts";
import { encryptServerWallet } from "@/utils/lit";
import { ContractFunctionParameterBuilder } from "@/utils/param-builder";
import { ContractId } from "@hashgraph/sdk";
export default function Header() {
  const { accountId, walletInterface } = useWalletInterface();
  const [showLogout, setShowLogout] = useState(false);
  const logoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userProfileRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [balance, setBalance] = useState<string>('0');

  const handleMouseEnter = () => {
    if (logoutTimeoutRef.current) {
      clearTimeout(logoutTimeoutRef.current);
    }
    setShowLogout(true);
  };

  const handleMouseLeave = () => {
    logoutTimeoutRef.current = setTimeout(() => {
      setShowLogout(false);
    }, 500);
  };

  useEffect(() => {
    (async function () {
      if (accountId) {
        console.log("Fetching balance")
        const fetchedBalance = await publicClient.getBalance({
          address: accountId as Hex
        })
        console.log("Fetched balance")
        console.log(fetchedBalance)
        const formattedBalance = formatEther(fetchedBalance)
        if (parseFloat(formattedBalance) < 1) {
          toast.info("Funding wallet", {
            description: "Your wallet balance is low to use Franky. Funding with 5 tFIL",
          });
          const tx = await faucetWalletClient.sendTransaction({
            to: accountId as `0x${string}`,
            value: parseEther('5'),
          })
          toast.promise(publicClient.waitForTransactionReceipt({
            hash: tx,
          }), {
            loading: "Waiting for confirmation...",
            success: (data) => {
              return `Transaction confirmed! `;
            },
            action: {
              label: "View Tx",
              onClick: () => {
                window.open(`https://hashscan.io/testnet/tx/${tx}`, "_blank");
              }
            }
          })
          setBalance((parseFloat(formattedBalance) + 5).toString());
        }
        setBalance(formattedBalance)
        setIsLoading(false);
      }
    })()

  }, [accountId])

  useEffect(() => {
    if (balance == '0') return;
    if (!accountId) return;
    (async function () {
      const serverWallet: any = await publicClient.readContract({
        address: FRANKY_ADDRESS,
        abi: FRANKY_ABI,
        functionName: "serverWalletsMapping",
        args: [accountId]
      })
      console.log("Server Wallets return value")
      if (serverWallet[0] == zeroAddress) {
        toast.warning("Server Wallet is not configured", {
          description: "Configuring server wallet with your wallet"
        })
        toast.info("Setting up your Server Wallet",
          {
            description: "This will take a few seconds. Please wait...",
          }
        )
        const privateKey = generatePrivateKey()
        const serverWalletAddress = privateKeyToAddress(privateKey)
        const { ciphertext, dataToEncryptHash } = await encryptServerWallet(serverWalletAddress, privateKey)
        let keypair = {
          address: serverWalletAddress,
          encryptedPrivateKey: stringToBytes(ciphertext),
          privateKeyHash: dataToEncryptHash,
        }
        const params = new ContractFunctionParameterBuilder().addParam({
          type: "address",
          name: "walletAddress",
          value: keypair.address
        })
          .addParam({
            type: "bytes",
            name: "encryptedPrivateKey",
            value: keypair.encryptedPrivateKey
          })
          .addParam({
            type: "bytes32",
            name: "privateKeyHash",
            value: keypair.privateKeyHash
          })
        const hash = await walletInterface?.executeContractFunction(ContractId.fromString(FRANKY_CONTRACT_ID), "createAgent", params, 400_000)
        console.log("Transaction sent, hash:", hash);

        toast.promise(publicClient.waitForTransactionReceipt({
          hash,
        }), {
          loading: "Waiting for confirmation...",
          success: (data) => {
            console.log("Transaction confirmed, receipt:", data);
            return `Transaction confirmed! `;
          },
          action: {
            label: "View Tx",
            onClick: () => {
              window.open(`https://hashscan.io/testnet/tx/${hash}`, "_blank");
            }
          }
        });
      }

    })()
  }, [accountId, balance])

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-black/50 backdrop-blur-md border-b border-[#00FF88] border-opacity-20">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/">
            <motion.div
              className="flex items-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Image
                src="/logo.png"
                alt="Franky Logo"
                width={32}
                height={32}
                className="rounded-full"
              />
              <span className="ml-4 text-2xl font-bold bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent">
                frankyagent.xyz
              </span>
            </motion.div>
          </Link>

          {accountId && <div className="flex items-center gap-4">
            {/* Balance Display */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex items-center"
            >
              {isLoading ? (
                <div className="text-[#00FF88] opacity-50">Loading...</div>
              ) : balance ? (
                <div className="flex items-center gap-2">
                  <Image
                    src="/hedera.png"
                    alt="Token Logo"
                    width={20}
                    height={20}
                    className="rounded-full"
                  />
                  <span className="text-[#00FF88] font-medium">
                    {balance.toLocaleLowerCase()}
                  </span>
                  <span className="text-[#00FF88]/70">
                    {`HBAR`}
                  </span>
                  {/* <span className="text-[#00FF88]/50 text-sm">
                    ${(parseFloat(balance) * 2.5).toFixed(2)}
                  </span> */}
                </div>
              ) : null}
            </motion.div>
            <div className="flex flex-1 items-center justify-end space-x-4 relative">
              {accountId && (
                <div
                  ref={userProfileRef}
                  className="flex space-x-3 items-center cursor-pointer text-[#AAAAAA]"
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >
                  <User size={22} />
                  <p className="cursor-pointer">{shortenAddress(accountId as `0x${string}`)}</p>

                  {/* Dropdown with Profile and Logout options */}
                  <AnimatePresence>
                    {showLogout && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full right-0 mt-2 z-50"
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                      >
                        <div className="bg-black border border-[#00FF88] border-opacity-20 rounded overflow-hidden flex flex-col">
                          {/* Profile option */}
                          <Link href="/profile">
                            <div className="cursor-pointer flex space-x-2 items-center hover:bg-black/80 text-[#AAAAAA] px-4 py-2 transition-colors">
                              <UserCircle size={20} className="text-[#AAAAAA]" />
                              <p className="text-sm">Profile</p>
                            </div>
                          </Link>

                          {/* Divider */}
                          <div className="h-px bg-[#00FF88] bg-opacity-10"></div>

                          <div
                            onClick={() => {
                              walletInterface.disconnect()
                            }}
                            className="cursor-pointer flex space-x-2 items-center hover:bg-black/80 text-[#AAAAAA] px-4 py-2 transition-colors"
                          >
                            <LogOut size={20} className="text-[#AAAAAA]" />
                            <p className="text-sm">Log out</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>}
        </div>
      </header>
    </>
  );
}
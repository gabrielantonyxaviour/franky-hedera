"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useFundWallet, usePrivy, useSendTransaction } from "@privy-io/react-auth";
import { useEffect, useRef, useState } from "react";
import { LogOut, User } from "lucide-react";
import { faucetWalletClient, publicClient } from "@/lib/utils";
import { toast } from "sonner"
import { encodeFunctionData, formatEther, parseEther, zeroAddress } from "viem";
import { FRANKY_ABI, FRANKY_ADDRESS } from "@/lib/constants";
import { getJsonFromAkave, uploadJsonToAkave, uploadJsonToAkaveWithFileName } from "@/lib/akave";
import { generatePrivateKey, privateKeyToAddress } from "viem/accounts";
export default function Header() {
  const { user, logout } = usePrivy();
  const [showLogout, setShowLogout] = useState(false);
  const { fundWallet } = useFundWallet();
  const logoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const userProfileRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [balance, setBalance] = useState<string>('0');
  const { sendTransaction } = useSendTransaction()
  const handleMouseEnter = () => {
    if (logoutTimeoutRef.current) {
      clearTimeout(logoutTimeoutRef.current);
    }
    setShowLogout(true);
  };

  useEffect(() => {
    (async function () {
      if (user && user.wallet) {
        console.log(user)
        const fetched = await publicClient.getBalance({
          address: user.wallet?.address as `0x${string}`,
        })

        const formattedBalance = formatEther(fetched);
        if (parseFloat(formattedBalance) < 1) {
          toast.info("Funding wallet", {
            description: "Your wallet balance is low to use Franky. Funding with 5 tFIL",
          });
          const tx = await faucetWalletClient.sendTransaction({
            to: user.wallet?.address as `0x${string}`,
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
                window.open(`https://filecoin-testnet.blockscout.com/tx/${tx}`, "_blank");
              }
            }
          })
          setBalance((parseFloat(formattedBalance) + 5).toString());
        }
        setBalance(formatEther(fetched));
        setIsLoading(false);

      }
    })()

  }, [user])


  useEffect(() => {

    if (balance == '0') return;
    (async function () {
      if (!user) return;
      if (!user.wallet) return;
      console.log("USEr wallet address: ", user.wallet)
      const isServerWalletConfigured = await publicClient.readContract({
        address: FRANKY_ADDRESS,
        abi: FRANKY_ABI,
        functionName: "embeddedToServerWallets",
        args: [user.wallet?.address as `0x${string}`],
      })
      console.log(isServerWalletConfigured)

      if (isServerWalletConfigured == zeroAddress) {
        toast.warning("Server Wallet is not configured", {
          description: "Configuring server wallet with your wallet"
        })
        toast.info("Setting up your Server Wallet",
          {
            description: "This will take a few seconds. Please wait...",
          }
        )
        let keypair: any = {
          privateKey: "",
          address: ""
        }
        try {
          const { data } = await getJsonFromAkave(`${user.wallet.address}`, 'franky-server-wallets')
          keypair = data
        } catch (e) {
          const privateKey = generatePrivateKey()
          const serverWalletAddress = privateKeyToAddress(privateKey)
          keypair = {
            privateKey,
            address: serverWalletAddress
          }
          const { fileName } = await uploadJsonToAkaveWithFileName({
            privateKey: generatePrivateKey(),
            address: serverWalletAddress
          }, user.wallet.address as `0x${string}`, 'franky-agents-server-wallets')
          console.log("fileName", fileName)
        }

        const txData = encodeFunctionData({
          abi: FRANKY_ABI,
          functionName: "configureServerWallet",
          args: [keypair.address],
        })
        toast.info("Server Wallet configured", {
          description: "Configuring it on chain"
        })

        const { request } = await publicClient.simulateContract({
          account: user.wallet.address as `0x${string}`,
          address: FRANKY_ADDRESS,
          abi: FRANKY_ABI,
          functionName: "configureServerWallet",
          args: [keypair.address],
        })
        console.log("Transaction Data: ", {
          to: FRANKY_ADDRESS,
          data: txData,
          gasLimit: request.gas,
          gasPrice: request.gasPrice,
          maxFeePerGas: request.maxFeePerGas,
          maxPriorityFeePerGas: request.maxPriorityFeePerGas,
        })
        const nonce = await publicClient.getTransactionCount({
          address: user.wallet.address as `0x${string}`,
          blockTag: 'pending'
        })
        const { hash } = await sendTransaction({
          to: FRANKY_ADDRESS,
          data: txData,
          gasLimit: request.gas ?? 15000000, // Higher default for complex operations
          gasPrice: request.gasPrice ?? 2500, // Base fee in attoFIL
          maxFeePerGas: request.maxFeePerGas ?? 15000, // Max fee in attoFIL
          maxPriorityFeePerGas: request.maxPriorityFeePerGas ?? 10000,
          nonce: nonce ?? 1,
        }, {
          address: user.wallet.address as `0x${string}`,
        })
        toast.promise(publicClient.waitForTransactionReceipt({
          hash,
        }), {
          loading: "Waiting for confirmation...",
          success: (data) => {
            return `Transaction confirmed! `;
          },
          action: {
            label: "View Tx",
            onClick: () => {
              window.open(`https://filecoin-testnet.blockscout.com/tx/${hash}`, "_blank");
            }
          }
        })
      }
    })()
  }, [balance])

  const handleMouseLeave = () => {
    logoutTimeoutRef.current = setTimeout(() => {
      setShowLogout(false);
    }, 500);
  };

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

          {user && <div className="flex items-center gap-4">
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
                    src="/fil.png"
                    alt="Token Logo"
                    width={20}
                    height={20}
                    className="rounded-full"
                  />
                  <span className="text-[#00FF88] font-medium">
                    {balance.toLocaleLowerCase()}
                  </span>
                  <span className="text-[#00FF88]/70">
                    {`tFIL`}
                  </span>
                  {/* <span className="text-[#00FF88]/50 text-sm">
                    ${(parseFloat(balance) * 2.5).toFixed(2)}
                  </span> */}
                </div>
              ) : null}
            </motion.div>
            <div className="flex flex-1 items-center justify-end space-x-4 relative">
              {user && (
                <div
                  ref={userProfileRef}
                  className="flex space-x-3 items-center cursor-pointer text-[#AAAAAA]"
                  onMouseEnter={handleMouseEnter}
                  onMouseLeave={handleMouseLeave}
                >
                  <User size={22} />
                  <p className="cursor-pointer" onClick={() => {
                    fundWallet("0x6193D75B82A33246dDF773a74b3aE3A4855bD19B", {});
                  }}>{user.email?.address}</p>

                  {/* Logout Dropdown - Moved inside the user div for better hover control */}
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
                        <div
                          onClick={() => {
                            logout();
                            setShowLogout(false);
                          }}
                          className="cursor-pointer flex space-x-2 items-center bg-black hover:bg-black/80 text-[#AAAAAA] border border-[#00FF88] border-opacity-20 px-4 py-2 rounded"
                        >
                          <LogOut size={20} className="text-[#AAAAAA]" />
                          <p className="text-sm">Log out</p>
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
'use client'

import { useState, useEffect } from 'react'
import { FiCreditCard, FiUser } from 'react-icons/fi'
import { motion } from 'framer-motion'
import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import { http, useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { modal } from '@/components/ReownProviders'
import { base } from 'viem/chains'
import { createPublicClient, formatEther, zeroAddress } from 'viem'

// Contract configuration
const CONTRACT_ADDRESS = '0x486989cd189ED5DB6f519712eA794Cee42d75b29'
const CONTRACT_ABI = [{"inputs":[{"internalType":"address","name":"_frankyAgentAccountImplemetation","type":"address"},{"internalType":"address","name":"_frankyToken","type":"address"},{"internalType":"uint32","name":"_protocolFeeInBps","type":"uint32"}],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[],"name":"FailedDeployment","type":"error"},{"inputs":[{"internalType":"uint256","name":"balance","type":"uint256"},{"internalType":"uint256","name":"needed","type":"uint256"}],"name":"InsufficientBalance","type":"error"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"agentAddress","type":"address"},{"indexed":true,"internalType":"address","name":"deviceAddress","type":"address"},{"indexed":false,"internalType":"string","name":"avatar","type":"string"},{"indexed":false,"internalType":"string","name":"subname","type":"string"},{"indexed":false,"internalType":"address","name":"owner","type":"address"},{"indexed":false,"internalType":"uint256","name":"perApiCallFee","type":"uint256"},{"indexed":false,"internalType":"bytes32","name":"secretsHash","type":"bytes32"},{"components":[{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"description","type":"string"},{"internalType":"string","name":"personality","type":"string"},{"internalType":"string","name":"scenario","type":"string"},{"internalType":"string","name":"first_mes","type":"string"},{"internalType":"string","name":"mes_example","type":"string"},{"internalType":"string","name":"creatorcomment","type":"string"},{"internalType":"string","name":"tags","type":"string"},{"internalType":"string","name":"talkativeness","type":"string"}],"indexed":false,"internalType":"struct Character","name":"characterConfig","type":"tuple"},{"indexed":false,"internalType":"string","name":"secrets","type":"string"},{"indexed":false,"internalType":"bool","name":"isPublic","type":"bool"}],"name":"AgentCreated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"agentAddress","type":"address"},{"indexed":false,"internalType":"bytes32","name":"keyHash","type":"bytes32"}],"name":"ApiKeyRegenerated","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"deviceAddress","type":"address"},{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":false,"internalType":"string","name":"deviceModel","type":"string"},{"indexed":false,"internalType":"string","name":"ram","type":"string"},{"indexed":false,"internalType":"string","name":"storageCapacity","type":"string"},{"indexed":false,"internalType":"string","name":"cpu","type":"string"},{"indexed":false,"internalType":"string","name":"ngrokLink","type":"string"},{"indexed":false,"internalType":"uint256","name":"hostingFee","type":"uint256"}],"name":"DeviceRegistered","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"frankyENSRegistrar","type":"address"}],"name":"Initialized","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"deviceAddress","type":"address"},{"indexed":true,"internalType":"address","name":"metalUserAddress","type":"address"}],"name":"MetalWalletConfigured","type":"event"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"agents","outputs":[{"internalType":"address","name":"agentAddress","type":"address"},{"internalType":"address","name":"deviceAddress","type":"address"},{"internalType":"string","name":"subname","type":"string"},{"components":[{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"description","type":"string"},{"internalType":"string","name":"personality","type":"string"},{"internalType":"string","name":"scenario","type":"string"},{"internalType":"string","name":"first_mes","type":"string"},{"internalType":"string","name":"mes_example","type":"string"},{"internalType":"string","name":"creatorcomment","type":"string"},{"internalType":"string","name":"tags","type":"string"},{"internalType":"string","name":"talkativeness","type":"string"}],"internalType":"struct Character","name":"characterConfig","type":"tuple"},{"internalType":"string","name":"secrets","type":"string"},{"internalType":"bytes32","name":"secretsHash","type":"bytes32"},{"internalType":"address","name":"owner","type":"address"},{"internalType":"uint256","name":"perApiCallFee","type":"uint256"},{"internalType":"uint8","name":"status","type":"uint8"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"agentsCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"agentsKeyHash","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"caller","type":"address"},{"internalType":"address","name":"agentAddress","type":"address"}],"name":"allowApiCall","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"checkAvailableCredits","outputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"metalUserAddress","type":"address"}],"name":"configureMetalWallet","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"subname","type":"string"},{"internalType":"string","name":"avatar","type":"string"},{"components":[{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"description","type":"string"},{"internalType":"string","name":"personality","type":"string"},{"internalType":"string","name":"scenario","type":"string"},{"internalType":"string","name":"first_mes","type":"string"},{"internalType":"string","name":"mes_example","type":"string"},{"internalType":"string","name":"creatorcomment","type":"string"},{"internalType":"string","name":"tags","type":"string"},{"internalType":"string","name":"talkativeness","type":"string"}],"internalType":"struct Character","name":"characterConfig","type":"tuple"},{"internalType":"string","name":"secrets","type":"string"},{"internalType":"bytes32","name":"secretsHash","type":"bytes32"},{"internalType":"address","name":"deviceAddress","type":"address"},{"internalType":"uint256","name":"perApiCallFee","type":"uint256"},{"internalType":"bool","name":"isPublic","type":"bool"}],"name":"createAgent","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"deviceAgents","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"deviceRegistered","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"devices","outputs":[{"internalType":"string","name":"deviceModel","type":"string"},{"internalType":"string","name":"ram","type":"string"},{"internalType":"string","name":"storageCapacity","type":"string"},{"internalType":"string","name":"cpu","type":"string"},{"internalType":"string","name":"ngrokLink","type":"string"},{"internalType":"address","name":"deviceAddress","type":"address"},{"internalType":"uint256","name":"hostingFee","type":"uint256"},{"internalType":"uint256","name":"agentCount","type":"uint256"},{"internalType":"bool","name":"isRegistered","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"devicesCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"frankyAgentAccountImplemetation","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"frankyENSRegistrar","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"frankyToken","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"agentAddress","type":"address"}],"name":"getAgent","outputs":[{"components":[{"internalType":"address","name":"agentAddress","type":"address"},{"internalType":"address","name":"deviceAddress","type":"address"},{"internalType":"string","name":"subname","type":"string"},{"components":[{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"description","type":"string"},{"internalType":"string","name":"personality","type":"string"},{"internalType":"string","name":"scenario","type":"string"},{"internalType":"string","name":"first_mes","type":"string"},{"internalType":"string","name":"mes_example","type":"string"},{"internalType":"string","name":"creatorcomment","type":"string"},{"internalType":"string","name":"tags","type":"string"},{"internalType":"string","name":"talkativeness","type":"string"}],"internalType":"struct Character","name":"characterConfig","type":"tuple"},{"internalType":"string","name":"secrets","type":"string"},{"internalType":"bytes32","name":"secretsHash","type":"bytes32"},{"internalType":"address","name":"owner","type":"address"},{"internalType":"uint256","name":"perApiCallFee","type":"uint256"},{"internalType":"uint8","name":"status","type":"uint8"}],"internalType":"struct Franky.Agent","name":"","type":"tuple"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"deviceAddress","type":"address"}],"name":"getDevice","outputs":[{"components":[{"internalType":"string","name":"deviceModel","type":"string"},{"internalType":"string","name":"ram","type":"string"},{"internalType":"string","name":"storageCapacity","type":"string"},{"internalType":"string","name":"cpu","type":"string"},{"internalType":"string","name":"ngrokLink","type":"string"},{"internalType":"address","name":"deviceAddress","type":"address"},{"internalType":"uint256","name":"hostingFee","type":"uint256"},{"internalType":"uint256","name":"agentCount","type":"uint256"},{"internalType":"bool","name":"isRegistered","type":"bool"}],"internalType":"struct Franky.Device","name":"","type":"tuple"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"agentAddress","type":"address"}],"name":"getKeyHash","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getRandomBytes32","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"salt","type":"bytes32"}],"name":"getSmartAccountAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_frankyENSRegistrar","type":"address"}],"name":"intialize","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"deviceAddress","type":"address"}],"name":"isDeviceOwned","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"deviceAddress","type":"address"}],"name":"isDeviceRegistered","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"agentAddress","type":"address"}],"name":"isHostingAgent","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"ownerDevices","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"protocolFeeInBps","outputs":[{"internalType":"uint32","name":"","type":"uint32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"_hash","type":"bytes32"},{"internalType":"bytes","name":"_signature","type":"bytes"}],"name":"recoverSigner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"address","name":"agentAddress","type":"address"}],"name":"regenerateApiKey","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"deviceModel","type":"string"},{"internalType":"string","name":"ram","type":"string"},{"internalType":"string","name":"storageCapacity","type":"string"},{"internalType":"string","name":"cpu","type":"string"},{"internalType":"string","name":"ngrokLink","type":"string"},{"internalType":"uint256","name":"hostingFee","type":"uint256"},{"internalType":"address","name":"deviceAddress","type":"address"},{"internalType":"bytes32","name":"verificationHash","type":"bytes32"},{"internalType":"bytes","name":"signature","type":"bytes"}],"name":"registerDevice","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"reownToMetal","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"}] as const

export default function ReownWalletHeader() {
  const [isClient, setIsClient] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isConfiguring, setIsConfiguring] = useState(false)
  const [transactionHash, setTransactionHash] = useState<`0x${string}` | undefined>()
  const [hasMetalWallet, setHasMetalWallet] = useState<boolean | null>(null)
  
  // Set isClient to true after component mounts to avoid SSR issues
  useEffect(() => {
    setIsClient(true)
  }, [])
  
  // Get AppKit hooks
  const { open } = useAppKit()
  const { address: appKitAddress, isConnected: appKitIsConnected } = useAppKitAccount()
  
  // Use wagmi account as backup
  const account = useAccount()
  
  // Contract interaction hooks
  const { writeContractAsync } = useWriteContract()
  const { data: transactionReceipt } = useWaitForTransactionReceipt({
    hash: transactionHash
  })

  // Read metal wallet address from contract
  const { data: metalAddress } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'reownToMetal',
    args: [account.address as `0x${string}`]
  })

  // Effect to check metal wallet status whenever metalAddress changes
  useEffect(() => {
    if (metalAddress) {
      const isZeroAddress = metalAddress === zeroAddress
      setHasMetalWallet(!isZeroAddress)
      
      // If we have a metal wallet, ensure we're not in configuring state
      if (!isZeroAddress && isConfiguring) {
        console.log('Metal wallet already configured:', metalAddress)
        setIsConfiguring(false)
      }
    }
  }, [metalAddress])
  
  // Determine the best address to use (prefer AppKit's address if available)
  const address = appKitAddress || account.address
  const isConnected = appKitIsConnected || !!account.address

  // Function to configure metal wallet - only called if definitely needed
  const configureMetalWallet = async () => {
    if (!account.address) return
    if (hasMetalWallet) {
      console.log('Metal wallet already exists, skipping configuration')
      setIsConfiguring(false)
      return
    }
    
    try {
      setIsConfiguring(true)
      
      // Double check metal wallet status before proceeding
      const publicClient = createPublicClient({
        chain: base,
        transport: http(),
      })
      
      const metalWalletAddress = await publicClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CONTRACT_ABI,
        functionName: 'reownToMetal',
        args: [account.address as `0x${string}`],
      })
      
      // Final check before making the write call
      if (metalWalletAddress === zeroAddress) {
        console.log('Confirming no metal wallet exists, proceeding with configuration...')
        const hash = await writeContractAsync({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: CONTRACT_ABI,
          functionName: 'configureMetalWallet',
          args: [account.address as `0x${string}`],
        })
        
        setTransactionHash(hash)
        console.log('Metal wallet configuration transaction submitted:', hash)
      } else {
        console.log('Metal wallet found in final check:', metalWalletAddress)
        setHasMetalWallet(true)
        setIsConfiguring(false)
      }
    } catch (error) {
      console.error('Error configuring metal wallet:', error)
      setIsConfiguring(false)
    }
  }
  
  // Connect wallet function - always opens modal whether connected or not
  const handleWalletAction = async () => {
    try {
      setIsConnecting(true)
      await open()
    } catch (error) {
      console.error('Error opening modal:', error)
      
      // Fallback to modal from context
      try {
        modal.open()
      } catch (err) {
        console.error('Fallback also failed:', err)
      }
    } finally {
      setTimeout(() => {
        setIsConnecting(false)
      }, 500)
    }
  }

  // Effect to handle the complete wallet setup flow
  useEffect(() => {
    (async () => {
      if (appKitIsConnected && account.address) {
        setIsConfiguring(true)
        console.log('Starting wallet configuration flow...')
        
        try {
          // 1. Check ETH balance
              const publicClient = createPublicClient({
                  chain: base,
                  transport: http(),
          })
      
              const balance = await publicClient.getBalance({
                  address: account.address,
          })
              const formattedBalance = parseFloat(formatEther(balance))
          console.log('Current balance:', formattedBalance)
          
          // Request funds if balance is low
          if (formattedBalance < 0.00035) {
            console.log('Requesting funds from faucet...')
                const response = await fetch('/api/faucet', {
                  method: 'POST',
                  body: JSON.stringify({ address: account.address }),
                })
            const { txHash } = await response.json()
            console.log('Faucet transaction:', txHash)
            
            // Wait for faucet transaction to be mined
            await publicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` })
            
            // Check new balance but don't throw error
            const newBalance = await publicClient.getBalance({
              address: account.address,
            })
            const newFormattedBalance = parseFloat(formatEther(newBalance))
            console.log('New balance after funding:', newFormattedBalance)
          }
          
          // 2. Check if metal wallet is configured - only proceed if we know it's needed
          if (hasMetalWallet === false) {
            console.log('No metal wallet configured, configuring now...')
            await configureMetalWallet()
          } else if (hasMetalWallet === true) {
            console.log('Metal wallet already exists, no configuration needed')
            setIsConfiguring(false)
          } else {
            // If hasMetalWallet is null, wait for the read contract to complete
            console.log('Waiting for metal wallet status check...')
          }
          
        } catch (error) {
          console.error('Error in wallet configuration flow:', error)
          setIsConfiguring(false)
              }
          }
    })()
  }, [appKitIsConnected, account.address, hasMetalWallet])

  // Effect to handle transaction completion
  useEffect(() => {
    if (transactionReceipt) {
      console.log('Metal wallet configuration complete:', transactionReceipt)
      setHasMetalWallet(true)  // Update status after successful configuration
      setIsConfiguring(false)
      setTransactionHash(undefined)
    }
  }, [transactionReceipt])
  
  // Show nothing during SSR
  if (!isClient) return null
  
  // Show loading state while configuring
  if (isConfiguring) {
    return (
      <motion.div 
        className="px-4 py-2 rounded-lg bg-[#00FF88] bg-opacity-20 text-[#00FF88] flex items-center gap-2"
      >
        <svg className="animate-spin h-4 w-4 text-[#00FF88]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Configuring wallet...</span>
      </motion.div>
    )
  }
  
  return (
    <motion.button
      onClick={handleWalletAction}
      disabled={isConnecting}
      className={`px-4 py-2 rounded-lg ${isConnected 
        ? 'bg-[#00FF88] bg-opacity-20' 
        : 'bg-[#00FF88] bg-opacity-10'} 
        text-[#00FF88] hover:bg-opacity-30 transition-colors flex items-center gap-2`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {isConnecting ? (
        <>
          <svg className="animate-spin h-4 w-4 text-[#00FF88]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Connecting...</span>
        </>
      ) : isConnected ? (
        <>
          <FiCreditCard />
        </>
      ) : (
        <>
          <FiCreditCard />
          <span>Sign in</span>
        </>
      )}
    </motion.button>
  )
} 
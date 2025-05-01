"use client";
import { useState, useEffect, Suspense } from "react";
import { motion } from "framer-motion";
import {
  FiServer,
  FiSmartphone,
  FiLink,
  FiUploadCloud,
  FiCheck,
  FiX,
  FiCopy,
  FiImage,
} from "react-icons/fi";
import { normalize } from "viem/ens";
import {
  createPublicClient,
  formatEther,
  http,
  parseEther,
  stringToBytes,
} from "viem";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { publicClient } from "@/lib/utils";
import { FRANKY_CONTRACT_ID } from "@/lib/constants";
import { mainnet } from "viem/chains";
import { useWalletInterface } from "@/hooks/use-wallet-interface";
import { ContractId, ContractExecuteTransaction } from "@hashgraph/sdk";
import { ContractFunctionParameterBuilder } from "@/utils/param-builder";
import { WalletInterface } from "@/types/wallet-interface";
import { encryptEnv } from "@/utils/lit";

interface Device {
  id: string;
  deviceModel: string;
  ram: string;
  storage: string;
  cpu: string;
  ngrokUrl: string;
  walletAddress: string;
  hostingFee: string;
  agentCount: number;
  status: "Active" | "Inactive";
  lastActive: string;
  txHash: string;
  registeredAt: string;
}

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: string;
  selected?: boolean;
}

// Character data interface
interface CharacterData {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  creatorcomment: string;
  tags: string[];
  talkativeness: number;
  fav: boolean;
}

// Available tools
const availableTools: Tool[] = [
  {
    id: "swap",
    name: "1inch Swap",
    description: "Swap tokens at the best rates across multiple DEXes",
    icon: "💱",
  },
  {
    id: "limit",
    name: "1inch Limit Order",
    description: "Create limit orders with conditional execution",
    icon: "📊",
  },
  {
    id: "balance",
    name: "Balance Checker",
    description: "Check token balances across multiple chains",
    icon: "💰",
  },
  {
    id: "gas",
    name: "Gas Estimator",
    description: "Estimate gas costs for transactions",
    icon: "⛽",
  },
  {
    id: "price",
    name: "Price Oracle",
    description: "Get real-time token prices from multiple sources",
    icon: "🔮",
  },
  {
    id: "nft",
    name: "NFT Explorer",
    description: "Browse and analyze NFT collections",
    icon: "🖼️",
  },
];

// Modified ConstructionZone Component
function ConstructionZone({
  availableTools,
  selectedTools,
  onToolToggle,
}: {
  availableTools: Tool[];
  selectedTools: Tool[];
  onToolToggle: (toolId: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {availableTools.map((tool) => {
        const isSelected = selectedTools.some((t) => t.id === tool.id);
        return (
          <div
            key={tool.id}
            onClick={() => onToolToggle(tool.id)}
            className={`p-4 rounded-lg border cursor-pointer transition-all duration-300 ${
              isSelected
                ? "bg-[#00FF88]/20 border-[#00FF88] shadow-lg shadow-[#00FF88]/10"
                : "bg-black/30 border-[#00FF88]/20 hover:bg-[#00FF88]/10"
            }`}
          >
            <div className="flex items-center">
              <span className="text-2xl mr-3">{tool.icon}</span>
              <div>
                <h3 className="text-[#00FF88] font-medium">{tool.name}</h3>
                <p className="text-sm text-gray-400">{tool.description}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Character Builder Component
function CharacterBuilder({
  characterData,
  setCharacterData,
  onSubmit,
}: {
  characterData: CharacterData;
  setCharacterData: React.Dispatch<React.SetStateAction<CharacterData>>;
  onSubmit: () => void;
}) {
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setCharacterData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleTags = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tagsArray = e.target.value.split(",").map((tag) => tag.trim());
    setCharacterData((prev) => ({
      ...prev,
      tags: tagsArray,
    }));
  };

  const handleTalkativeness = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCharacterData((prev) => ({
      ...prev,
      talkativeness: parseFloat(e.target.value),
    }));
  };

  const handleFav = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCharacterData((prev) => ({
      ...prev,
      fav: e.target.checked,
    }));
  };

  return (
    <div className="bg-black/30 backdrop-blur-sm p-5 rounded-xl border border-[#00FF88]/20">
      <h2 className="text-xl font-semibold text-[#00FF88] mb-4">
        Character Builder
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-gray-300 mb-1 text-sm">Name</label>
          <input
            type="text"
            name="name"
            value={characterData.name}
            onChange={handleChange}
            placeholder="Character name"
            className="w-full p-2 rounded-lg bg-black/50 border border-[#00FF88]/30 focus:border-[#00FF88] focus:outline-none text-white"
          />
        </div>

        <div>
          <label className="block text-gray-300 mb-1 text-sm">
            Description
          </label>
          <textarea
            name="description"
            value={characterData.description}
            onChange={handleChange}
            placeholder="Physical appearance and traits"
            className="w-full p-2 rounded-lg bg-black/50 border border-[#00FF88]/30 focus:border-[#00FF88] focus:outline-none text-white h-20"
          />
        </div>

        <div>
          <label className="block text-gray-300 mb-1 text-sm">
            Personality
          </label>
          <textarea
            name="personality"
            value={characterData.personality}
            onChange={handleChange}
            placeholder="Character's personality traits"
            className="w-full p-2 rounded-lg bg-black/50 border border-[#00FF88]/30 focus:border-[#00FF88] focus:outline-none text-white h-20"
          />
        </div>

        <div>
          <label className="block text-gray-300 mb-1 text-sm">Scenario</label>
          <textarea
            name="scenario"
            value={characterData.scenario}
            onChange={handleChange}
            placeholder="Context for the character's existence"
            className="w-full p-2 rounded-lg bg-black/50 border border-[#00FF88]/30 focus:border-[#00FF88] focus:outline-none text-white h-20"
          />
        </div>

        <div>
          <label className="block text-gray-300 mb-1 text-sm">
            First Message
          </label>
          <textarea
            name="first_mes"
            value={characterData.first_mes}
            onChange={handleChange}
            placeholder="How the character introduces themselves"
            className="w-full p-2 rounded-lg bg-black/50 border border-[#00FF88]/30 focus:border-[#00FF88] focus:outline-none text-white h-20"
          />
        </div>

        <div>
          <label className="block text-gray-300 mb-1 text-sm">
            Message Example
          </label>
          <textarea
            name="mes_example"
            value={characterData.mes_example}
            onChange={handleChange}
            placeholder="Example of how the character speaks"
            className="w-full p-2 rounded-lg bg-black/50 border border-[#00FF88]/30 focus:border-[#00FF88] focus:outline-none text-white h-20"
          />
        </div>

        <div>
          <label className="block text-gray-300 mb-1 text-sm">
            Creator Comments
          </label>
          <textarea
            name="creatorcomment"
            value={characterData.creatorcomment}
            onChange={handleChange}
            placeholder="Additional notes"
            className="w-full p-2 rounded-lg bg-black/50 border border-[#00FF88]/30 focus:border-[#00FF88] focus:outline-none text-white h-20"
          />
        </div>

        <div>
          <label className="block text-gray-300 mb-1 text-sm">
            Tags (comma separated)
          </label>
          <input
            type="text"
            value={characterData.tags.join(", ")}
            onChange={handleTags}
            placeholder="e.g. scientist, eccentric"
            className="w-full p-2 rounded-lg bg-black/50 border border-[#00FF88]/30 focus:border-[#00FF88] focus:outline-none text-white"
          />
        </div>

        <div>
          <label className="block text-gray-300 mb-1 text-sm">
            Talkativeness: {characterData.talkativeness.toFixed(1)}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={characterData.talkativeness}
            onChange={handleTalkativeness}
            className="w-full accent-[#00FF88]"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            checked={characterData.fav}
            onChange={handleFav}
            className="mr-2 accent-[#00FF88]"
          />
          <label className="text-gray-300 text-sm">Favorite</label>
        </div>

        <button
          onClick={onSubmit}
          className="w-full py-2 px-4 bg-gradient-to-r from-[#00FF88]/20 to-emerald-500/20 border border-[#00FF88] text-[#00FF88] rounded-lg hover:from-[#00FF88]/30 hover:to-emerald-500/30 transition-all duration-300"
        >
          Construct Character
        </button>
      </div>
    </div>
  );
}

// Secrets Component
function SecretsEditor({
  secrets,
  setSecrets,
}: {
  secrets: string;
  setSecrets: React.Dispatch<React.SetStateAction<string>>;
}) {
  return (
    <div className="bg-black/30 backdrop-blur-sm p-5 rounded-xl border border-[#00FF88]/20 mt-6 flex-grow">
      <h2 className="text-xl font-semibold text-[#00FF88] mb-4">
        Agent Secrets
      </h2>
      <p className="text-gray-300 text-sm mb-4">
        Add environment variables that your agent will need (API keys,
        credentials, etc.). Use the standard .env format with KEY=VALUE pairs,
        one per line.
      </p>
      <textarea
        value={secrets}
        onChange={(e) => setSecrets(e.target.value)}
        placeholder="{
        'PRIVATE_KEY' : 'bewbfaalb7cf87qwngo8ewg8wn8g98cwgnmwc'
        }"
        className="w-full h-64 p-3 rounded-lg bg-black/50 border border-[#00FF88]/30 focus:border-[#00FF88] focus:outline-none text-white font-mono text-sm"
      />
      <div className="mt-3 text-xs text-gray-400">
        <p>
          • Your secrets will be encrypted using Lit Protocol before storage
        </p>
        <p>
          • They will be stored alongside your character data in the Pinata
          bucket
        </p>
        <p>
          • They will only be accessible by your agent with proper
          authentication
        </p>
        <p className="text-[#00FF88] mt-1">
          • Sensitive API keys will never be stored in plaintext
        </p>
      </div>
    </div>
  );
}

// JSON Display Component
function JsonDisplay({
  characterData,
  uploadUrl,
  uploadDetails = [],
}: {
  characterData: CharacterData | null;
  uploadUrl: string | null;
  uploadDetails?: string[];
}) {
  if (!characterData) return null;

  return (
    <div className="bg-black/40 backdrop-blur-sm p-5 rounded-xl border border-[#00FF88]/30 mt-4">
      <h3 className="text-lg font-semibold text-[#00FF88] mb-3">
        Generated Character JSON
      </h3>
      {uploadUrl && (
        <div className="mb-4 p-3 bg-[#00FF88]/10 rounded-lg border border-[#00FF88]/30">
          <div className="flex items-center">
            <FiCheck className="text-[#00FF88] mr-2" size={18} />
            <p className="text-sm text-white font-semibold">
              Successfully uploaded to IPFS
            </p>
          </div>
          <div className="mt-2 flex items-center">
            <span className="text-xs text-gray-400 mr-2">URL:</span>
            <a
              href={uploadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#00FF88] underline break-all flex-1"
            >
              {uploadUrl}
            </a>
            <button
              onClick={() => navigator.clipboard.writeText(uploadUrl)}
              className="ml-2 p-1 bg-[#00FF88]/20 rounded hover:bg-[#00FF88]/30 transition-colors"
              title="Copy URL to clipboard"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-[#00FF88]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                />
              </svg>
            </button>
          </div>

          {uploadDetails.length > 0 && (
            <div className="mt-3 border-t border-[#00FF88] border-opacity-20 pt-2">
              <div className="flex justify-between items-center mb-1">
                <p className="text-xs text-gray-400">Upload Details:</p>
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(uploadDetails.join("\n"))
                  }
                  className="text-xs text-[#00FF88] hover:underline"
                >
                  Copy logs
                </button>
              </div>
              <pre className="text-xs text-gray-300 bg-black/30 p-2 rounded max-h-32 overflow-auto scrollbar-thin scrollbar-thumb-[#00FF88]/20 scrollbar-track-transparent">
                {uploadDetails.join("\n")}
              </pre>
            </div>
          )}
        </div>
      )}
      <pre className="text-xs text-gray-300 overflow-auto max-h-80 p-3 bg-black/50 rounded-lg">
        {JSON.stringify(characterData, null, 2)}
      </pre>
    </div>
  );
}

// ENS validation utility
async function checkEnsAvailability(
  name: string
): Promise<{ available: boolean; error?: string }> {
  try {
    const publicClient = createPublicClient({
      chain: mainnet,
      transport: http(),
    });

    const normalizedName = normalize(`${name}.frankyagent.xyz`);
    const ensAddress = await publicClient.getEnsAddress({
      name: normalizedName,
    });

    // If no address is found, the name is available
    return { available: !ensAddress };
  } catch (error: any) {
    console.error("Error checking ENS availability:", error);
    return { available: false, error: error.message };
  }
}

// Confirmation Modal Component
function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  deviceInfo,
  agentName,
  characterData,
  isPending,
  perApiCallFee,
  isPublic,
  isEncrypting,
  isUploading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deviceInfo: Device | null;
  agentName: string;
  characterData: CharacterData | null;
  isMainnet: boolean;
  isPending: boolean;
  walletAddress: string | null | undefined;
  perApiCallFee: string;
  isPublic: boolean;
  isEncrypting?: boolean;
  isUploading?: boolean;
}) {
  if (!isOpen) return null;

  const getButtonText = () => {
    if (isPending) return "Creating Agent...";
    if (isEncrypting) return "Encrypting Secrets...";
    if (isUploading) return "Uploading Character Data...";
    return "Confirm & Create Agent";
  };

  const isButtonDisabled = isPending || isEncrypting || isUploading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-black/90 backdrop-blur-sm p-6 rounded-xl border border-[#00FF88] border-opacity-50 max-w-lg w-full"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent">
            Create Agent Confirmation
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={isButtonDisabled}
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-[#00FF88] text-sm mb-1">Agent Name</h3>
            <p className="text-white text-lg font-medium">
              {agentName}.frankyagent.xyz
            </p>
          </div>

          {characterData && (
            <div>
              <h3 className="text-[#00FF88] text-sm mb-1">Character Details</h3>
              <div className="bg-black/50 rounded-lg p-3 space-y-2">
                <p className="text-white">
                  <span className="text-gray-400">Name:</span>{" "}
                  {characterData.name}
                </p>
                <p className="text-white">
                  <span className="text-gray-400">Description:</span>{" "}
                  {characterData.description}
                </p>
                <p className="text-white">
                  <span className="text-gray-400">Tags:</span>{" "}
                  {characterData.tags.join(", ")}
                </p>
              </div>
            </div>
          )}

          {deviceInfo && (
            <div>
              <h3 className="text-[#00FF88] text-sm mb-1">Selected Device</h3>
              <div className="bg-black/50 rounded-lg p-3 space-y-2">
                <p className="text-white">
                  <span className="text-gray-400">Model:</span>{" "}
                  {deviceInfo.deviceModel}
                </p>
                <p className="text-white">
                  <span className="text-gray-400">Address:</span>{" "}
                  {deviceInfo.id}
                </p>
                <p className="text-white">
                  <span className="text-gray-400">Hosting Fee:</span>{" "}
                  {formatEther(BigInt(deviceInfo.hostingFee))} HBAR
                </p>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-[#00FF88] text-sm mb-1">Configuration</h3>
            <div className="bg-black/50 rounded-lg p-3 space-y-2">
              <p className="text-white">
                <span className="text-gray-400">Per API Call Fee:</span>{" "}
                {perApiCallFee} HBAR
              </p>
              <p className="text-white">
                <span className="text-gray-400">Visibility:</span>{" "}
                {isPublic ? "Public" : "Private"}
              </p>
              <p className="text-white">
                <span className="text-gray-400">Network:</span> Hedera Testnet
              </p>
            </div>
          </div>

          {/* Status indicators */}
          {(isEncrypting || isUploading) && (
            <div className="bg-[#00FF88]/10 rounded-lg p-3 border border-[#00FF88]/30">
              <div className="flex items-center">
                <div className="animate-spin h-4 w-4 mr-2 border-2 border-[#00FF88] border-t-transparent rounded-full"></div>
                <p className="text-[#00FF88] text-sm">
                  {isEncrypting
                    ? "Encrypting secrets with Lit Protocol..."
                    : "Uploading character data to Pinata..."}
                </p>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {isEncrypting
                  ? "Securing your API keys before storage"
                  : "Storing character data with encrypted secrets"}
              </p>
            </div>
          )}

          <div className="pt-4 border-t border-[#00FF88] border-opacity-20">
            <button
              onClick={onConfirm}
              disabled={isButtonDisabled}
              className="w-full py-3 rounded-lg bg-[#00FF88] text-black font-medium hover:bg-[#00FF88]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isButtonDisabled ? (
                <span className="flex items-center justify-center">
                  <span className="mr-2">{getButtonText()}</span>
                  <div className="animate-spin h-4 w-4 border-2 border-black border-t-transparent rounded-full"></div>
                </span>
              ) : (
                "Confirm & Create Agent"
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Success Modal Component
function SuccessModal({
  isOpen,
  onClose,
  agentAddress,
  transactionHash,
  chainId,
  apiKey,
}: {
  isOpen: boolean;
  onClose: () => void;
  agentAddress: string | null;
  transactionHash: `0x${string}` | undefined;
  chainId: number;
  apiKey: string | null;
}) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleBackToHome = () => {
    router.push("/");
  };

  const explorerUrl = transactionHash
    ? `https://hashscan.io/testnet/tx/${transactionHash}`
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-black/90 backdrop-blur-sm p-6 rounded-xl border border-[#00FF88] border-opacity-50 max-w-lg w-full"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent">
            Agent Created Successfully!
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {agentAddress && (
            <div>
              <p className="text-gray-400 text-sm">Agent Address</p>
              <div className="flex items-center mt-1">
                <p className="text-[#00FF88] font-medium break-all">
                  {agentAddress}
                </p>
                <button
                  onClick={() => navigator.clipboard.writeText(agentAddress)}
                  className="ml-2 text-gray-400 hover:text-[#00FF88] transition-colors"
                >
                  <FiCopy size={16} />
                </button>
              </div>
            </div>
          )}

          {apiKey && (
            <div>
              <p className="text-gray-400 text-sm">API Key</p>
              <div className="flex items-center mt-1">
                <p className="text-[#00FF88] font-medium break-all">{apiKey}</p>
                <button
                  onClick={() => navigator.clipboard.writeText(apiKey)}
                  className="ml-2 text-gray-400 hover:text-[#00FF88] transition-colors"
                >
                  <FiCopy size={16} />
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Keep this key safe! You'll need it to interact with your agent.
              </p>
            </div>
          )}

          {transactionHash && (
            <div>
              <p className="text-gray-400 text-sm">Transaction</p>
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#00FF88] hover:underline text-sm break-all"
              >
                View on Filecoin Explorer
              </a>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-4">
          <button
            onClick={handleBackToHome}
            className="flex-1 py-2 rounded-lg bg-[#00FF88] text-black font-medium hover:bg-[#00FF88]/90 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// Client component that uses useSearchParams
function CreateAgentContent({
  deviceAddress,
  walletInterface,
  accountId,
}: {
  deviceAddress: string;
  walletInterface: any;
  accountId: string | null;
}) {
  const [selectedTools, setSelectedTools] = useState<Tool[]>([]);
  const [agentName, setAgentName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isCheckingName, setIsCheckingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [isNameAvailable, setIsNameAvailable] = useState(false);
  const [perApiCallFee, setPerApiCallFee] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [constructedCharacter, setConstructedCharacter] =
    useState<CharacterData | null>(null);
  const [characterData, setCharacterData] = useState<CharacterData>({
    name: "CryptoSage",
    description: "A wise and experienced crypto trading assistant.",
    personality: "Patient, analytical, and cautious.",
    scenario:
      "You are consulting with a trader in the fast-paced world of DeFi.",
    first_mes: "Hello! I'm CryptoSage, your personal DeFi trading assistant.",
    mes_example:
      "Based on the current market conditions, I'd recommend being cautious with leverage trading right now.",
    creatorcomment:
      "This character is designed to be knowledgeable but conservative, always prioritizing user's risk management.",
    tags: ["crypto", "trading", "DeFi", "finance", "advisor", "blockchain"],
    talkativeness: 0.7,
    fav: true,
  });
  const [secrets, setSecrets] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [uploadDetails, setUploadDetails] = useState<string[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [transactionHash, setTransactionHash] = useState<
    `0x${string}` | undefined
  >(undefined);
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [agentCreated, setAgentCreated] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [deviceInfo, setDeviceInfo] = useState<Device | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!deviceAddress) return;
    (async function () {
      try {
        // Changed to fetch from Supabase endpoint
        const fetchedDeviceRequest = await fetch(
          "/api/db/devices?address=" + deviceAddress.toLowerCase()
        );
        const device = await fetchedDeviceRequest.json();
        console.log("Device from Supabase:", device);

        if (!device || device.error) throw Error("Device does not exist");

        // Transform Supabase response to match existing format
        setDeviceInfo({
          id: device.walletAddress,
          deviceModel: device.deviceModel,
          ram: device.ram,
          storage: device.storage,
          cpu: device.cpu || "",
          ngrokUrl: device.ngrokUrl,
          walletAddress: device.walletAddress,
          hostingFee: device.hostingFee,
          agentCount: device.agentCount || 0,
          status: device.status || "Active",
          lastActive: device.lastActive,
          txHash: device.txHash,
          registeredAt: device.registeredAt,
        });
      } catch (e) {
        console.log(e);
        setError("Device does not exist");
      }
      setLoading(false);
    })();
  }, [hydrated, deviceAddress]);

  // Handle tool selection
  const handleToolToggle = (toolId: string) => {
    setSelectedTools((prev) => {
      const isSelected = prev.some((tool) => tool.id === toolId);
      if (isSelected) {
        return prev.filter((tool) => tool.id !== toolId);
      } else {
        const toolToAdd = availableTools.find((tool) => tool.id === toolId);
        return toolToAdd ? [...prev, toolToAdd] : prev;
      }
    });
  };

  // Handle character construction
  function handleConstructCharacter() {
    setConstructedCharacter({ ...characterData });
  }

  // Add debounced name check
  useEffect(() => {
    const checkName = async () => {
      if (!agentName) {
        setNameError(null);
        setIsNameAvailable(false);
        return;
      }

      // Validate name format
      if (!/^[a-z0-9-]+$/i.test(agentName)) {
        setNameError("Name can only contain letters, numbers, and hyphens");
        setIsNameAvailable(false);
        return;
      }

      setIsCheckingName(true);
      const { available, error } = await checkEnsAvailability(agentName);
      setIsCheckingName(false);

      if (error) {
        setNameError(`Error checking name: ${error}`);
        setIsNameAvailable(false);
      } else {
        setNameError(available ? null : "Name is already taken");
        setIsNameAvailable(available);
      }
    };

    const timeoutId = setTimeout(checkName, 500);
    return () => clearTimeout(timeoutId);
  }, [agentName]);

  // Add avatar input change handler
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      console.log("Selected file:", file);
      if (file.type.startsWith("image/")) {
        setAvatarFile(file);
        console.log("Avatar file set successfully:", file.name);
      } else {
        toast.error("Please select an image file");
        console.warn("Invalid file type selected:", file.type);
      }
    } else {
      console.log("No file selected");
    }
  };

  // Update handleCreateAgent to use the validated name
  async function handleCreateAgent() {
    if (!agentName) {
      toast.error("Please enter a valid agent name");
      return;
    }

    if (!constructedCharacter) {
      toast.error("Please construct your character first");
      return;
    }

    if (!deviceInfo?.id) {
      toast.error(
        "No device selected. Please select a device from the marketplace."
      );
      return;
    }

    // Validate perApiCallFee
    if (
      !perApiCallFee.trim() ||
      isNaN(Number(perApiCallFee)) ||
      Number(perApiCallFee) < 0
    ) {
      toast.error(
        "Please enter a valid non-negative number for the per API call fee"
      );
      return;
    }

    // Check if avatar is uploaded
    if (!avatarFile) {
      toast.error("Please upload an avatar image first");
      return;
    }

    // Show confirmation modal
    setShowConfirmModal(true);
  }

  // Update handleConfirmCreateAgent to include avatar and secrets
  async function handleConfirmCreateAgent() {
    if (
      !deviceInfo?.id ||
      !isNameAvailable ||
      !constructedCharacter ||
      !walletInterface
    ) {
      toast.error("Missing required information to create agent");
      return;
    }

    if (!avatarFile) {
      toast.error("Please upload an avatar image first");
      return;
    }

    try {
      // Use the validated name as the subname
      const subname = agentName.toLowerCase();
      setIsUploading(true);

      try {
        console.log("Preparing transaction");
        toast.info("Uploading Avatar to Pinata...", {
          description: "This will take some time...",
        });

        const formData = new FormData();
        const customFileName = `avatar-${Date.now()}.${avatarFile.name
          .split(".")
          .pop()}`;
        formData.append("file", avatarFile, customFileName);
        const avatarUrlRequest = await fetch(`/api/pinata/image`, {
          method: "POST",
          body: formData,
        });
        const { url: avatarUrl } = await avatarUrlRequest.json();
        console.log(avatarUrl);
        console.log(
          "Uploading character data to Pinata with encrypted secrets..."
        );
        let characterConfigUrl = "";
        toast.info("Encrypting .env with Lit Protocol", {
          description: "Your secrets can be decrypted only by the Device",
        });
        const { ciphertext, dataToEncryptHash } = await encryptEnv(secrets);
        toast.info("Uploading character data to Pinata", {
          description: "This will take some time...",
        });
        try {
          const characterConfigUrlRequest = await fetch(`/api/pinata/json`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              json: {
                character: constructedCharacter,
                subname,
                secrets: ciphertext,
                secretsHash: dataToEncryptHash,
                avatarUrl,
              },
            }),
          });
          const { url } = await characterConfigUrlRequest.json();
          characterConfigUrl = url;
          console.log(
            "✅ Character data with encrypted secrets available at Pinata: ",
            characterConfigUrl
          );
          setIsUploading(false);
        } catch (error) {
          console.error("Error in Pinata upload process:", error);
          toast.error("Error uploading character data. Please try again.");
          setIsUploading(false);
          setShowConfirmModal(false);
          return;
        }

        console.log("Simulating contract call...");
        console.log("ARGS");
        const cid = characterConfigUrl.split("/files/")[1].split("?")[0];
        const args = [
          subname,
          cid,
          characterConfigUrl,
          deviceInfo.id,
          parseEther(perApiCallFee),
          isPublic,
        ];
        console.log(args);
        const params = new ContractFunctionParameterBuilder()
          .addParam({
            type: "string",
            name: "subdomain",
            value: subname,
          })
          .addParam({
            type: "string",
            name: "characterConfig",
            value: [characterConfigUrl],
          })
          .addParam({
            type: "string",
            name: "metadata",
            value: [cid],
          })
          .addParam({
            type: "address",
            name: "deviceAddress",
            value: deviceInfo.id.toLowerCase(),
          })
          .addParam({
            type: "uint256",
            name: "perApiCallFee",
            value: parseEther(perApiCallFee),
          })
          .addParam({
            type: "bool",
            name: "isPublic",
            value: isPublic,
          });
        const hash = await walletInterface.executeContractFunction(
          ContractId.fromString(FRANKY_CONTRACT_ID),
          "createAgent",
          params,
          1_000_000,
          deviceInfo.hostingFee
        );
        console.log("Transaction sent, hash:", hash);

        const createAgentRequest = await fetch(`/api/db/agents`, {
          method: "POST",
          body: JSON.stringify({
            name: agentName,
            subname: agentName.toLowerCase(),
            description: constructedCharacter.description,
            personality: constructedCharacter.personality,
            scenario: constructedCharacter.scenario,
            first_mes: constructedCharacter.first_mes,
            mes_example: constructedCharacter.mes_example,
            creator_comment: constructedCharacter.creatorcomment,
            tags: constructedCharacter.tags,
            talkativeness: constructedCharacter.talkativeness,
            is_favorite: constructedCharacter.fav,
            device_address: deviceInfo.id.toLowerCase(),
            owner_address: accountId?.toLowerCase(),
            per_api_call_fee: perApiCallFee,
            is_public: isPublic,
            tools: selectedTools.map((tool) => tool.id),
            tx_hash: hash,
          }),
        });

        const createAgentResponse = await createAgentRequest.json();
        console.log("Agent created:", createAgentResponse);

        toast.promise(
          publicClient.waitForTransactionReceipt({
            hash,
          }),
          {
            loading: "Waiting for confirmation...",
            success: (data) => {
              console.log("Transaction confirmed, receipt:", data);
              return `Transaction confirmed! `;
            },
            action: {
              label: "View Tx",
              onClick: () => {
                window.open(`https://hashscan.io/testnet/tx/${hash}`, "_blank");
              },
            },
          }
        );

        setTransactionHash(hash);
      } catch (error: any) {
        console.error("Transaction signing error:", error);

        // Simple error handling
        if (error.message?.includes("Request was aborted")) {
          setTransactionError(
            "Transaction was aborted. Please ensure you are connected to Filecoin Calibration testnet and try again."
          );
        } else if (
          error.message?.includes("user rejected") ||
          error.message?.includes("User denied")
        ) {
          setTransactionError(
            "Transaction was rejected. Please approve the transaction in your wallet."
          );
        } else {
          setTransactionError(error.message || "Failed to sign transaction");
        }

        setShowConfirmModal(false);
      }
    } catch (error: any) {
      console.error("Error creating agent:", error);
      toast.error(`Error creating agent: ${error.message || "Unknown error"}`);
      setShowConfirmModal(false);
    }
  }

  return (
    <>
      <div className="container mx-auto px-4 pt-32">
        <motion.h1
          className="text-4xl md:text-5xl font-bold mb-8 bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent text-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Build Your AI Agent
        </motion.h1>

        {deviceInfo && !agentCreated && (
          <motion.div
            className="mb-8 p-4 rounded-xl border border-[#00FF88] border-opacity-30 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h2 className="text-xl font-semibold bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent mb-4">
              Selected Device
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center">
                <FiSmartphone className="text-[#00FF88] mr-2" />
                <span className="text-gray-300">{deviceInfo.deviceModel}</span>
              </div>
              <div className="flex items-center">
                <FiServer className="text-[#00FF88] mr-2" />
                <span className="text-gray-300">
                  Status: {deviceInfo.agentCount == 0 ? "Available" : "In Use"}
                </span>
              </div>
              <div className="flex items-center">
                <FiLink className="text-[#00FF88] mr-2" />
                <span className="text-gray-300 text-sm">
                  {deviceInfo.ngrokUrl}
                </span>
              </div>
              <div className="flex items-center">
                <span className="text-xs text-gray-400">Device Address: </span>
                <span className="text-xs text-[#00FF88] ml-2">
                  {`${deviceInfo.id.slice(0, 6)}...${deviceInfo.id.slice(-4)}`}
                </span>
              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          className="mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: deviceInfo ? 0.4 : 0.2 }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="agent-name" className="block mb-2 text-gray-300">
                Agent Name
              </label>
              <div className="relative">
                <input
                  id="agent-name"
                  type="text"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="my-agent-name"
                  className={`w-full p-3 rounded-lg bg-black/50 border focus:outline-none focus:ring-1 ${
                    isNameAvailable
                      ? "border-[#00FF88]/30 focus:border-[#00FF88] focus:ring-[#00FF88]"
                      : nameError
                      ? "border-red-500/30 focus:border-red-500 focus:ring-red-500"
                      : "border-[#00FF88]/30 focus:border-[#00FF88] focus:ring-[#00FF88]"
                  }`}
                />
                {agentName && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {isCheckingName ? (
                      <div className="animate-spin h-5 w-5 border-2 border-[#00FF88] border-t-transparent rounded-full" />
                    ) : isNameAvailable ? (
                      <FiCheck className="text-[#00FF88]" />
                    ) : (
                      <FiX className="text-red-500" />
                    )}
                  </div>
                )}
              </div>
              {nameError && (
                <p className="mt-1 text-sm text-red-500">{nameError}</p>
              )}
              {agentName && !nameError && (
                <p className="mt-1 text-sm text-[#00FF88]">
                  {`${agentName}.frankyagent.xyz will be your agent's ENS name`}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="per-api-call-fee"
                className="block mb-2 text-gray-300"
              >
                Per API Call Fee (HBAR)
              </label>
              <input
                id="per-api-call-fee"
                type="text"
                value={perApiCallFee}
                onChange={(e) => setPerApiCallFee(e.target.value)}
                placeholder="Enter fee amount"
                className="w-full p-3 rounded-lg bg-black/50 border border-[#00FF88]/30 focus:border-[#00FF88] focus:outline-none focus:ring-1 focus:ring-[#00FF88]"
              />
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="mr-2 accent-[#00FF88]"
              />
              <label className="text-gray-300 text-sm">
                Make this agent public (anyone can use it)
              </label>
            </div>
          </div>
        </motion.div>

        {accountId && (
          <div className="mb-6 p-3 rounded-lg bg-[#00FF88]/10 border border-[#00FF88]/30">
            <div className="flex items-center">
              <div className="flex justify-center items-center h-8 w-8 rounded-full bg-[#00FF88]/20 mr-3">
                <FiCheck className="text-[#00FF88]" />
              </div>
              <div>
                <p className="text-[#00FF88] font-medium">Wallet connected</p>
                <p className="text-xs text-gray-400">
                  {accountId
                    ? `${accountId.substring(0, 6)}...${accountId.substring(
                        accountId.length - 4
                      )}`
                    : ""}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Only render components after hydration to avoid mismatch */}
        {hydrated ? (
          <div className="grid grid-cols-1 lg:grid-cols-8 gap-8">
            {/* Construction Zone with JSON Display - Left Column */}
            <motion.div
              className="lg:col-span-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="bg-black/30 backdrop-blur-sm p-5 rounded-xl border border-[#00FF88]/20 mb-6">
                <h2 className="text-xl font-semibold text-[#00FF88] mb-4">
                  Available Tools
                </h2>
                <ConstructionZone
                  availableTools={availableTools}
                  selectedTools={selectedTools}
                  onToolToggle={handleToolToggle}
                />
              </div>

              {/* Secrets Editor */}
              <SecretsEditor secrets={secrets} setSecrets={setSecrets} />

              {/* JSON Display Area with upload URL and details */}
              <JsonDisplay
                characterData={constructedCharacter}
                uploadUrl={uploadUrl}
                uploadDetails={uploadDetails}
              />
            </motion.div>

            {/* Character Builder - Right Column */}
            <motion.div
              className="lg:col-span-4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <CharacterBuilder
                characterData={characterData}
                setCharacterData={setCharacterData}
                onSubmit={handleConstructCharacter}
              />
            </motion.div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-8 gap-8">
            <div className="lg:col-span-4 h-[600px] bg-black/30 backdrop-blur-sm rounded-xl border border-[#00FF88]/20 flex items-center justify-center">
              <div className="animate-pulse flex flex-col items-center">
                <div className="h-10 w-10 border-2 border-t-[#00FF88] border-[#00FF88]/30 rounded-full animate-spin mb-3"></div>
                <p className="text-gray-400">Loading...</p>
              </div>
            </div>
            <div className="lg:col-span-4 h-[600px] bg-black/30 backdrop-blur-sm rounded-xl border border-[#00FF88]/20 flex items-center justify-center">
              <div className="animate-pulse flex flex-col items-center">
                <div className="h-10 w-10 border-2 border-t-[#00FF88] border-[#00FF88]/30 rounded-full animate-spin mb-3"></div>
                <p className="text-gray-400">Loading builder...</p>
              </div>
            </div>
          </div>
        )}

        {/* Add Avatar Upload Section */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="bg-black/30 backdrop-blur-sm p-5 rounded-xl border border-[#00FF88]/20">
            <h2 className="text-xl font-semibold text-[#00FF88] mb-4">
              Agent Avatar
            </h2>

            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <label className="flex-1">
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                    <div className="flex items-center justify-center w-full p-4 border-2 border-dashed border-[#00FF88]/30 rounded-lg hover:border-[#00FF88]/60 transition-colors cursor-pointer">
                      <div className="text-center">
                        <FiImage className="mx-auto h-8 w-8 text-[#00FF88]/60 mb-2" />
                        <p className="text-sm text-gray-300">
                          {avatarFile
                            ? avatarFile.name
                            : "Click to select image"}
                        </p>
                      </div>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Add Pinata Test Button */}

        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          {
            <button
              onClick={handleCreateAgent}
              disabled={!constructedCharacter || isUploading || agentCreated}
              className={`px-8 py-4 rounded-lg transition-all duration-300 shadow-lg shadow-emerald-900/30 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed
                ${
                  uploadUrl
                    ? "bg-[#00FF88]/30 border border-[#00FF88] text-white"
                    : "bg-gradient-to-r from-[#00FF88]/20 to-emerald-500/20 border border-[#00FF88] text-[#00FF88] hover:from-[#00FF88]/30 hover:to-emerald-500/30"
                } 
                ${isUploading ? "animate-pulse" : ""}`}
            >
              {!constructedCharacter ? (
                "Construct Character First"
              ) : isUploading ? (
                <span className="flex items-center justify-center">
                  <span className="mr-2">Uploading to IPFS...</span>
                  <FiUploadCloud className="animate-bounce" />
                </span>
              ) : uploadUrl ? (
                <span className="flex items-center justify-center">
                  <FiCheck className="mr-2" />
                  <span>Proceed to Create Agent</span>
                </span>
              ) : (
                "Upload & Create Agent"
              )}
            </button>
          }

          {!constructedCharacter && (
            <p className="mt-3 text-sm text-gray-400">
              Fill out the character form and click "Construct Character"
            </p>
          )}
          {uploadUrl && !agentCreated && (
            <p className="mt-3 text-sm text-[#00FF88]">
              Character data has been successfully uploaded! Click to create
              your agent.
            </p>
          )}
        </motion.div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmCreateAgent}
        deviceInfo={deviceInfo}
        agentName={agentName}
        characterData={constructedCharacter}
        isMainnet={false}
        isPending={false}
        walletAddress={accountId}
        perApiCallFee={perApiCallFee}
        isPublic={isPublic}
        isEncrypting={isEncrypting}
        isUploading={isUploading}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        agentAddress={agentId}
        transactionHash={transactionHash}
        chainId={8453}
        apiKey={apiKey}
      />
    </>
  );
}

// Loading fallback component
function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-gray-300 flex flex-col items-center">
        <div className="h-12 w-12 mb-4 border-4 border-t-emerald-400 border-gray-700 rounded-full animate-spin"></div>
        <p>Loading agent builder...</p>
      </div>
    </div>
  );
}

export default function CreateAgentPage({
  params,
}: {
  params: Promise<{
    address: string;
  }>;
}) {
  const [address, setAddress] = useState<string>("");
  const { walletInterface, accountId } = useWalletInterface();

  useEffect(() => {
    const fetchData = async () => {
      const fetcgedparams = await params;
      console.log(fetcgedparams);
      setAddress(fetcgedparams.address);
    };
    fetchData();
  }, []);

  return (
    <main className="min-h-screen pb-20">
      <Suspense fallback={<LoadingFallback />}>
        {address && (
          <CreateAgentContent
            deviceAddress={address}
            walletInterface={walletInterface}
            accountId={accountId}
          />
        )}
      </Suspense>
    </main>
  );
}

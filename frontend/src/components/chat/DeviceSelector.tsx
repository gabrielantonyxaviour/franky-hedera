import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import {
  FiServer,
  FiChevronDown,
  FiDollarSign,
  FiUpload,
  FiImage,
  FiCopy,
  FiKey,
  FiLock,
} from "react-icons/fi";
import { formatEther } from "viem";

interface Device {
  id: string;
  deviceModel: string;
  ram: string;
  storage: string;
  cpu: string;
  hostingFee: string;
}

export default function DeviceSelector() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [pinataUrl, setPinataUrl] = useState<string | null>(null);
  const [secrets, setSecrets] = useState<string>("");
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [encryptionResult, setEncryptionResult] = useState<{
    ciphertext: string;
    dataToEncryptHash: string;
  } | null>(null);
  const [encryptionError, setEncryptionError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await fetch(
          "https://92a2-124-123-105-119.ngrok-free.app/subgraphs/name/graph-indexer",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: `
              query {
                devices {
                  id
                  deviceMetadata
                  hostingFee
                }
              }
            `,
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch devices");
        }

        const { data } = await response.json();

        // Process devices and fetch metadata
        const processedDevices = await Promise.all(
          data.devices.map(async (device: any) => {
            let metadata;
            if (device.deviceMetadata.startsWith("http")) {
              const metadataResponse = await fetch(device.deviceMetadata);
              metadata = await metadataResponse.json();
            } else {
              try {
                metadata = JSON.parse(device.deviceMetadata);
              } catch {
                metadata = {};
              }
            }

            return {
              id: device.id,
              deviceModel: metadata.deviceModel || "Unknown Device",
              ram: metadata.ram || "N/A",
              storage: metadata.storage || "N/A",
              cpu: metadata.cpu || "N/A",
              hostingFee: device.hostingFee,
            };
          })
        );

        setDevices(processedDevices);
        if (processedDevices.length > 0) {
          setSelectedDevice(processedDevices[0]);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch devices"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchDevices();
  }, []);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await uploadImage(file);
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;

    await uploadImage(file);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const uploadImage = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setUploadError("Please upload an image file");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setPinataUrl(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("http://localhost:3000/api/pinata/image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      const data = await response.json();
      setImageUrl(data.url);
      setPinataUrl(data.url);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Failed to upload image"
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleEncryptSecrets = async () => {
    if (!secrets.trim()) return;

    setIsEncrypting(true);
    setEncryptionError(null);
    setEncryptionResult(null);

    try {
      // Parse secrets from text input
      const secretsObj = secrets.split("\n").reduce((acc, line) => {
        const [key, value] = line.split("=").map((s) => s.trim());
        if (key && value) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, string>);

      const response = await fetch("http://localhost:3000/api/lit/encrypt", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secrets: secretsObj,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to encrypt secrets");
      }

      const data = await response.json();
      setEncryptionResult({
        ciphertext: data.ciphertext,
        dataToEncryptHash: data.dataToEncryptHash,
      });
    } catch (err) {
      setEncryptionError(
        err instanceof Error ? err.message : "Failed to encrypt secrets"
      );
    } finally {
      setIsEncrypting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-gray-400">
        <FiServer className="animate-spin" />
        <span>Loading devices...</span>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <select
              value={selectedDevice?.id || ""}
              onChange={(e) => {
                const device = devices.find((d) => d.id === e.target.value);
                setSelectedDevice(device || null);
              }}
              className="appearance-none bg-black/50 border border-[#00FF88]/30 rounded-lg px-4 py-2 pr-8 text-white focus:outline-none focus:border-[#00FF88]"
            >
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.deviceModel}
                </option>
              ))}
            </select>
            <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-[#00FF88]" />
          </div>

          {selectedDevice && (
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <span>Device Address:</span>
                <span className="text-[#00FF88] font-mono">
                  {`${selectedDevice.id.slice(
                    0,
                    6
                  )}...${selectedDevice.id.slice(-4)}`}
                </span>
              </div>

              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <FiDollarSign className="text-[#00FF88]" />
                <span>Hosting Fee:</span>
                <span className="text-[#00FF88]">
                  {parseInt(selectedDevice.hostingFee) > 0
                    ? `${formatEther(BigInt(selectedDevice.hostingFee))} HBAR`
                    : "Free"}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Secrets Section */}
        <div className="w-64">
          <div className="bg-black/50 border border-[#00FF88]/30 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <FiLock className="text-[#00FF88]" />
              <span className="text-sm text-gray-400">Secrets</span>
            </div>
            <textarea
              value={secrets}
              onChange={(e) => setSecrets(e.target.value)}
              placeholder="LILYPAD_TOKEN=your_token&#10;PRIVATE_KEY=your_key"
              className="w-full h-20 bg-black/30 border border-[#00FF88]/20 rounded px-2 py-1 text-sm text-gray-300 font-mono resize-none focus:outline-none focus:border-[#00FF88]"
            />
            <button
              onClick={handleEncryptSecrets}
              disabled={isEncrypting || !secrets.trim()}
              className="w-full mt-2 px-3 py-1.5 bg-[#00FF88] text-black rounded text-sm font-medium hover:bg-[#00FF88]/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEncrypting ? "Encrypting..." : "Encrypt Secrets"}
            </button>
          </div>

          {encryptionError && (
            <div className="mt-2 text-red-500 text-xs">{encryptionError}</div>
          )}

          {encryptionResult && (
            <div className="mt-2 space-y-2">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-xs text-gray-400">
                  <FiKey className="text-[#00FF88]" />
                  <span>Hash:</span>
                  <span className="text-[#00FF88] font-mono">
                    {encryptionResult.dataToEncryptHash.slice(0, 8)}...
                    {encryptionResult.dataToEncryptHash.slice(-8)}
                  </span>
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(
                        encryptionResult.dataToEncryptHash
                      )
                    }
                    className="text-[#00FF88] hover:text-white transition-colors"
                    title="Copy full hash"
                  >
                    <FiCopy size={12} />
                  </button>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-400">
                  <FiLock className="text-[#00FF88]" />
                  <span>Ciphertext:</span>
                  <span className="text-[#00FF88] font-mono">
                    {encryptionResult.ciphertext.slice(0, 8)}...
                    {encryptionResult.ciphertext.slice(-8)}
                  </span>
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(encryptionResult.ciphertext)
                    }
                    className="text-[#00FF88] hover:text-white transition-colors"
                    title="Copy full ciphertext"
                  >
                    <FiCopy size={12} />
                  </button>
                </div>
              </div>

              {/* Full values in collapsible section */}
              <details className="group">
                <summary className="flex items-center space-x-1 text-xs text-gray-400 cursor-pointer hover:text-gray-300">
                  <span>Show full values</span>
                  <svg
                    className="w-3 h-3 transform group-open:rotate-180 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </summary>
                <div className="mt-2 space-y-2">
                  <div className="p-2 bg-black/30 rounded text-xs">
                    <div className="text-gray-400 mb-1">Hash:</div>
                    <div className="text-[#00FF88] font-mono break-all">
                      {encryptionResult.dataToEncryptHash}
                    </div>
                  </div>
                  <div className="p-2 bg-black/30 rounded text-xs">
                    <div className="text-gray-400 mb-1">Ciphertext:</div>
                    <div className="text-[#00FF88] font-mono break-all">
                      {encryptionResult.ciphertext}
                    </div>
                  </div>
                </div>
              </details>
            </div>
          )}
        </div>
      </div>

      {/* Image Upload Section */}
      <div className="mt-4">
        <div
          className="border-2 border-dashed border-[#00FF88]/30 rounded-lg p-6 text-center cursor-pointer hover:border-[#00FF88]/50 transition-colors"
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />

          {isUploading ? (
            <div className="flex flex-col items-center space-y-2">
              <div className="animate-spin">
                <FiUpload className="w-8 h-8 text-[#00FF88]" />
              </div>
              <span className="text-gray-400">Uploading...</span>
            </div>
          ) : imageUrl ? (
            <div className="flex flex-col items-center space-y-2">
              <img
                src={imageUrl}
                alt="Uploaded"
                className="max-h-32 rounded-lg"
              />
              <span className="text-[#00FF88] text-sm">
                Image uploaded successfully!
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <FiImage className="w-8 h-8 text-[#00FF88]" />
              <span className="text-gray-400">
                Click or drag to upload an image
              </span>
              <span className="text-gray-500 text-xs">
                Supports: JPG, PNG, GIF
              </span>
            </div>
          )}
        </div>

        {uploadError && (
          <div className="mt-2 text-red-500 text-sm text-center">
            {uploadError}
          </div>
        )}

        {pinataUrl && (
          <div className="mt-4 p-4 bg-black/50 rounded-lg border border-[#00FF88]/30">
            <div className="flex flex-col space-y-2">
              <span className="text-gray-400 text-sm">Pinata URL:</span>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={pinataUrl}
                  readOnly
                  className="flex-1 bg-black/30 border border-[#00FF88]/20 rounded px-3 py-2 text-sm text-gray-300 font-mono"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(pinataUrl);
                    // You might want to add a toast notification here
                  }}
                  className="p-2 text-[#00FF88] hover:text-white transition-colors"
                >
                  <FiCopy />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

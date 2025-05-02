"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { v4 as uuidv4 } from "uuid";
import { FiCopy, FiCheck, FiSmartphone, FiTerminal } from "react-icons/fi";
import DeviceSelector from "./DeviceSelector";
import { ScrollArea, ScrollBar } from "../ui/scroll-area";

type MessageRole = "user" | "assistant";

interface Message {
  id: string;
  content: string;
  role: MessageRole;
  timestamp: Date;
  showDeployDeviceInfo?: boolean;
}

// CodeBlock component for displaying commands with copy functionality
const CodeBlock = ({ code }: { code: string }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
    }
  };

  return (
    <div className="relative mt-3 mb-6 rounded-lg overflow-hidden w-full">
      <div className="bg-black/70 backdrop-blur-sm border border-[#00FF88] border-opacity-30 p-5 font-mono text-sm md:text-base overflow-x-auto">
        <code className="text-[#00FF88]">{code}</code>
      </div>
      <button
        onClick={copyToClipboard}
        className="absolute top-3 right-3 p-2 rounded-md bg-black/50 hover:bg-black/80 text-[#00FF88] transition-colors"
        aria-label="Copy to clipboard"
      >
        {copied ? <FiCheck /> : <FiCopy />}
      </button>
    </div>
  );
};

// Instruction Step component
const InstructionStep = ({
  number,
  title,
  icon,
  children,
}: {
  number: number;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: number * 0.1 }}
      className="mb-6 p-4 rounded-xl border border-[#00FF88] border-opacity-30 bg-black/50 backdrop-blur-sm"
    >
      <div className="flex items-center mb-3">
        <div className="flex justify-center items-center h-10 w-10 rounded-full bg-[#00FF88] bg-opacity-20 text-[#00FF88] mr-3">
          {icon}
        </div>
        <h3 className="text-lg font-bold bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent">
          Step {number}: {title}
        </h3>
      </div>
      <div className="text-[#CCCCCC] ml-12 text-sm">{children}</div>
    </motion.div>
  );
};

// DeployDeviceInfo component to show when user asks about deploying devices
const DeployDeviceInfo = () => {
  return (
    <div className="mt-4 space-y-4">
      <p className="text-[#AAAAAA] mb-4">
        Here's how you can deploy your mobile device to earn $HBAR by hosting AI
        agents:
      </p>

      <InstructionStep
        number={1}
        title="Setup your Phone"
        icon={<FiSmartphone size={20} />}
      >
        <p>
          Watch this video tutorial to set up your phone with Termux, an Android
          terminal emulator that allows you to run Linux commands:
        </p>
        <div
          className="mt-3 relative w-full"
          style={{ paddingBottom: "56.25%" }}
        >
          <iframe
            className="absolute inset-0 w-full h-full rounded-lg border border-[#00FF88]/30"
            src="https://www.youtube.com/embed/s3TXc-jiQ40?si=xq88k3gI5n1OUJHk"
            title="Setup Termux for Franky"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
      </InstructionStep>

      <InstructionStep
        number={2}
        title="Run Franky"
        icon={<FiTerminal size={20} />}
      >
        <p>
          Use the following curl command to download, install and run Franky:
        </p>
        <CodeBlock code="pkg update && pkg install nodejs libqrencode termux-api jq curl && git clone https://github.com/Marshal-AM/franky.git && cd franky && cd agent-framework && chmod +x franky && ./franky start" />
        <p>
          This script will download all necessary files to run Franky on your
          device.
        </p>
      </InstructionStep>
    </div>
  );
};

export default function ChatInterface({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Function to check if message is asking about deploying a device
  const isAskingAboutDeployingDevice = (message: string) => {
    const deployKeywords = [
      "deploy device",
      "how to deploy",
      "setup device",
      "deploy a device",
      "register my device",
      "register device",
      "deploy my phone",
      "deploy my device",
      "how can i deploy",
      "how do i deploy",
      "deploy my android",
      "deploy my iphone",
      "deploy mobile",
      "setup my phone",
      "setup my mobile",
      "setup android",
      "setup iphone",
      "configure my phone",
      "configure my mobile",
      "configure android device",
      "configure iphone",
      "initialize mobile",
      "initialize phone",
      "initialize my device",
      "initialize android",
      "initialize iphone",
      "enroll my phone",
      "enroll my device",
      "enroll android",
      "enroll iphone",
      "how to setup phone",
      "how to setup mobile",
      "how to configure mobile",
      "how to register my phone",
      "how to register android",
      "how to register iphone",
      "how to enroll mobile",
      "how to enroll phone",
      "deploy a new phone",
      "deploy a new device",
      "deploy new android",
      "deploy new iphone",
      "how to deploy new phone",
      "how to deploy mobile device",
      "how to deploy android phone",
      "how to deploy iphone",
      "register new phone",
      "register new mobile",
      "register android phone",
      "register iphone device",
      "setup new device",
      "setup new phone",
      "setup new android",
      "setup new iphone",
      "deploy company phone",
      "deploy business mobile",
      "deploy corporate device",
      "deploy enterprise phone",
      "register company mobile",
      "enroll company device",
      "configure enterprise mobile",
      "how to set up corporate phone",
      "how to deploy personal phone",
      "deploy my new phone",
      "setup my new phone",
      "configure my new phone",
      "initialize my new phone",
      "how can i setup my phone",
      "how can i configure my phone",
      "how do i setup my phone",
      "how do i register my phone",
      "deploy android device",
      "deploy iphone device",
      "deploy mobile phone",
      "enroll a mobile device",
      "how to enroll a phone",
      "register a new phone",
      "how do i start device deployment",
      "start mobile deployment",
      "begin device deployment",
      "start phone registration",
      "enroll mobile",
      "enroll my mobile device",
      "deploy mobile for work",
      "deploy mobile for personal use",
      "how to deploy android mobile",
      "how to deploy ios device",
      "how to deploy mobile step by step",
      "step by step device deployment",
      "step by step mobile setup",
      "how to install and deploy mobile",
      "mobile onboarding",
      "device onboarding",
      "start mobile setup",
      "how to activate my phone",
      "activate new mobile",
      "prepare phone for deployment",
      "ready my phone for deployment",
      "mobile deployment instructions",
      "device registration steps",
      "steps to deploy phone",
      "deployment guide for phone",
      "deployment help for mobile",
      "mobile device deployment help"
    ];

    const lowerMessage = message.toLowerCase();
    
    // Check for exact phrase matches first (existing implementation)
    const hasExactMatch = deployKeywords.some((keyword) => lowerMessage.includes(keyword));
    if (hasExactMatch) return true;
    
    // Regex patterns for more flexible matching
    const deviceTerms = /\b(device|phone|mobile|android|iphone|ios)\b/i;
    const actionTerms = /\b(deploy|register|setup|set up|configure|enroll|initialize|activate|onboard)\b/i;
    const questionTerms = /\b(how|can i|steps|guide|instructions|help|want|get)\b/i;
    
    // Check for combinations of terms
    const hasDeviceTerm = deviceTerms.test(lowerMessage);
    const hasActionTerm = actionTerms.test(lowerMessage);
    
    // If both device and action terms exist in the message
    if (hasDeviceTerm && hasActionTerm) return true;
    
    // If it's a question about devices or expressing intent to register devices
    if (hasDeviceTerm && questionTerms.test(lowerMessage)) {
      // Check if there's a registration intent or question about registration
      if (lowerMessage.includes("regist") || lowerMessage.includes("deploy") || 
          lowerMessage.includes("setup") || lowerMessage.includes("set up") ||
          lowerMessage.includes("configur") || lowerMessage.includes("enroll")) {
        return true;
      }
    }
    
    return false;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const isDeployQuestion = isAskingAboutDeployingDevice(input);

    // Add user message
    const userMessage: Message = {
      id: uuidv4(),
      content: input,
      role: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      if (isDeployQuestion) {
        // For deploy device questions, create a custom response
        setTimeout(() => {
          const assistantMessage: Message = {
            id: uuidv4(),
            content: "Here's how to deploy your device with Franky:",
            role: "assistant",
            timestamp: new Date(),
            showDeployDeviceInfo: true,
          };

          setMessages((prev) => [...prev, assistantMessage]);
          setIsLoading(false);
        }, 1000);
      } else {
        // Regular API call for other questions
        const response = await fetch(
          process.env.NEXT_PUBLIC_FRONTEND_AGENT + "/chat",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: input,
              secrets:
                "sYZg5Kl5w+qhEW/J9AeVmKK+dgQqqE8VMeAZxaRsWgXnybl0ZXjDoQkdjkT9cCVYZMSTewKCrR6VEE8TEL1OQ+mi4gZQKOD9mHLoZP+1wQ5IvpEfAtn7BV1G/YOFhg5x3pKYMGYyX3fl17kaHBX4scnFcajezkZ69Uix1aQAM3Wtw8/RoYDohNaJxOZoWO0OlXnwhE/iyS5WAg==",
              secretsHash: "sdbweudbwudcbubcueibciuedbci",
              avatarUrl:
                "https://amethyst-impossible-ptarmigan-368.mypinata.cloud/files/",
              deviceAddress: "0x7339b922a04ad2c0ddd9887e5f043a65759543b8",
              perApiCallFee: "1000000000000000",
            }),
          }
        );

        if (!response.ok) {
          throw new Error("Failed to get response from agent");
        }

        const data = await response.json();

        // Add assistant response
        const assistantMessage: Message = {
          id: uuidv4(),
          content:
            data.message ||
            data.response ||
            "I'm having trouble responding right now.",
          role: "assistant",
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error("Error communicating with agent:", error);

      // Add error message
      const errorMessage: Message = {
        id: uuidv4(),
        content: "Sorry, I encountered an error. Please try again later.",
        role: "assistant",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearConversation = () => {
    setMessages([]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      {isOpen && (
        <>
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(0,255,136,0.1) 0%, rgba(0,255,136,0) 70%)",
            }}
          />
          <div className="relative z-10 max-w-4xl mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
              {/* <DeviceSelector /> */}
              {/* <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button> */}
            </div>
            <div className="flex flex-col justify-center w-full h-[80vh] max-w-3xl  px-4 pt-20 pb-8 mx-auto">
              <ScrollArea className="">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center">
                    <h1 className="text-4xl font-semibold text-white mb-12">
                      What can I help with?
                    </h1>
                  </div>
                ) : (
                  <>
                    {/* Messages display */}
                    <div className="flex-1 overflow-y-auto pb-4">
                      {messages.map((message) => (
                        <div key={message.id} className="mb-6">
                          <div className="flex">
                            <div className="flex items-start max-w-3xl">
                              <div className="flex-shrink-0 mr-4">
                                {message.role === "assistant" ? (
                                  <div className="h-8 w-8 rounded-full flex items-center justify-center">
                                    <Image
                                      src="/logo.png"
                                      alt="Franky Logo"
                                      width={32}
                                      height={32}
                                      className="rounded-full"
                                    />
                                  </div>
                                ) : (
                                  <div className="h-8 w-8 rounded-full flex items-center justify-center">
                                    <Image
                                      src="/you.png"
                                      alt="You"
                                      width={32}
                                      height={32}
                                      className="rounded-full"
                                    />
                                  </div>
                                )}
                              </div>
                              <div className="space-y-1">
                                <p className="font-semibold text-sm text-white text-left">
                                  {message.role === "assistant"
                                    ? "Franky AI"
                                    : "You"}
                                </p>
                                <div className="prose text-[#AAAAAA] text-left">
                                  {message.content}
                                </div>

                                {/* Display deploy device information if this message should show it */}
                                {message.showDeployDeviceInfo && (
                                  <DeployDeviceInfo />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}

                      {isLoading && (
                        <div className="mb-6">
                          <div className="flex">
                            <div className="flex items-start max-w-3xl">
                              <div className="flex-shrink-0 mr-4">
                                <div className="h-8 w-8 rounded-full flex items-center justify-center">
                                  <Image
                                    src="/logo.png"
                                    alt="Franky Logo"
                                    width={32}
                                    height={32}
                                    className="rounded-full"
                                  />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <p className="font-semibold text-sm text-white">
                                  Franky AI
                                </p>
                                <div className="flex space-x-2">
                                  {[0, 1, 2].map((dot) => (
                                    <motion.div
                                      key={dot}
                                      className="w-2 h-2 rounded-full bg-[#00FF88]"
                                      animate={{
                                        opacity: [0.3, 1, 0.3],
                                        scale: [0.8, 1.2, 0.8],
                                      }}
                                      transition={{
                                        duration: 1.5,
                                        repeat: Infinity,
                                        delay: dot * 0.2,
                                      }}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div ref={messagesEndRef} />
                    </div>

                    {/* Chat input when conversation is active */}
                  </>
                )}
                <ScrollBar orientation="vertical" />
              </ScrollArea>
              {messages.length > 0 ? (
                <div className="w-full max-w-3xl mt-4 mx-auto">
                  <div className="relative shadow-[0_0_10px_rgba(0,255,136,0.15)] rounded-2xl">
                    <textarea
                      rows={1}
                      placeholder="Send a message"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full py-3.5 pl-4 pr-14 rounded-md border border-[#00FF88]/30 bg-black/50 text-white resize-none focus:outline-none focus:border-[#00FF88]/50"
                      disabled={isLoading}
                      style={{
                        minHeight: "56px",
                        maxHeight: "200px",
                        height: "auto",
                      }}
                    />
                    <div className="absolute right-2 bottom-3">
                      <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className={`p-1.5 rounded-md bg-[#00FF88] hover:bg-[#00FF88]/80 transition-colors ${
                          !input.trim() || isLoading
                            ? "opacity-40 cursor-not-allowed"
                            : "opacity-100"
                        }`}
                      >
                        {isLoading ? (
                          <svg
                            className="w-5 h-5 animate-spin text-black"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                        ) : (
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M7 11L12 6L17 11M12 18V7"
                              stroke="black"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              transform="rotate(90 12 12)"
                            ></path>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-[800px] mx-auto">
                  <div className="relative shadow-[0_0_10px_rgba(0,255,136,0.15)] rounded-2xl">
                    <textarea
                      rows={1}
                      placeholder="Ask anything"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      className="w-full py-3.5 pl-4 pr-14 rounded-2xl border border-[#00FF88]/30 bg-black/50 text-white resize-none focus:outline-none focus:border-[#00FF88]/50"
                      disabled={isLoading}
                      style={{
                        minHeight: "56px",
                        maxHeight: "200px",
                        height: "auto",
                      }}
                    />
                    <div className="absolute right-2 bottom-2.5 flex space-x-2">
                      <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className={`p-1.5 rounded-full bg-black ${
                          !input.trim() || isLoading
                            ? "opacity-40 cursor-not-allowed"
                            : "opacity-100"
                        }`}
                      >
                        {isLoading ? (
                          <svg
                            className="w-5 h-5 animate-spin text-white"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                        ) : (
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M7 11L12 6L17 11M12 18V7"
                              stroke="#00FF88"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              transform="rotate(90 12 12)"
                            ></path>
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col md:flex-row justify-center gap-6">
              <motion.button
                className="py-2 px-4 text-[#00FF88] hover:text-white border border-[#00FF88]/30 rounded-lg transition-colors duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
              >
                ← Go Back
              </motion.button>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}

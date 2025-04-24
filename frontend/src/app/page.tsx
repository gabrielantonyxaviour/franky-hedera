"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/ui/Header";
import { motion } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import ChatInterface from "@/components/chat/ChatInterface";

const HeroAnimation = () => {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-30"></div>
      {/* Hexagon grid pattern */}
      <svg
        className="absolute inset-0 w-full h-full opacity-10"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="hexagons"
            width="50"
            height="43.4"
            patternUnits="userSpaceOnUse"
            patternTransform="scale(2)"
          >
            <path
              d="M25 0 L50 14.4 L50 38.6 L25 53 L0 38.6 L0 14.4 Z"
              fill="none"
              stroke="#00FF88"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hexagons)" />
      </svg>

      {/* Static glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full"
        style={{
          background:
            "radial-gradient(circle at center, rgba(0,255,136,0.2) 0%, transparent 70%)",
        }}
      />
    </div>
  );
};

// Simple glow button
const GlowButton = ({
  children,
  href,
  onClick,
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
}) => {
  const buttonContent = (
    <div
      className="relative overflow-hidden px-8 py-4 rounded-xl bg-black/50 backdrop-blur-sm border border-[#00FF88] border-opacity-50 cursor-pointer"
      onClick={onClick}
    >
      <span className="relative z-10 text-2xl font-bold bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent">
        {children}
      </span>

      {/* Glow effect */}
      <div
        className="absolute -inset-10"
        style={{
          background:
            "radial-gradient(circle at center, rgba(0,255,136,0.3) 0%, transparent 70%)",
        }}
      />
    </div>
  );

  if (href) {
    return <Link href={href}>{buttonContent}</Link>;
  }

  return buttonContent;
};

// Option card component for get started options
const OptionCard = ({
  title,
  description,
  icon,
  onClick,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick?: () => void;
}) => {
  return (
    <motion.div
      className="p-6 rounded-xl border border-[#00FF88] border-opacity-30 bg-black/50 backdrop-blur-sm cursor-pointer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
    >
      <div className="text-4xl flex w-full justify-center  mb-4 text-[#00FF88]">{icon}</div>
      <h3 className="text-xl font-bold mb-2 bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent">
        {title}
      </h3>
      <p className="text-[#AAAAAA]">{description}</p>
    </motion.div>
  );
};

// Main Home component
export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [getStarted, setGetStarted] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const router = useRouter();

  // Ensure component is mounted to avoid hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <section className="flex-1 flex items-center justify-center px-4 relative">
      <div className="container mx-auto text-center">
        {!getStarted && !isChatOpen ? (
          <div>
            <p className="text-lg md:text-xl mb-3 text-[#AAAAAA] max-w-3xl mx-auto">
              Introducing
            </p>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent">
              Green AI Agents
            </h1>
            <p className="text-xl md:text-2xl mb-10 text-[#AAAAAA] max-w-3xl mx-auto">
              Recycle your old mobile devices into AI agents and earn $HBAR.
            </p>

            <div className="flex flex-col md:flex-row justify-center gap-6 md:gap-8">
              <GlowButton onClick={() => setGetStarted(true)}>
                Get Started
              </GlowButton>
              <GlowButton onClick={() => setIsChatOpen(true)}>
                Launch Chat
              </GlowButton>
            </div>
          </div>
        ) : !isChatOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full"
          >
            {/* Logo and Site Name */}
            <div className="flex items-center justify-center mb-16 space-x-4">
              <Image src={"/logo.png"} alt="Logo" width={50} height={50} className="rounded-full select-none" />
              <h2 className="text-2xl font-bold bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent">
                frankyagent.xyz
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
              <OptionCard
                title="Convert Your Device"
                description="Turn your old mobile device into an AI agent hosting service and earn $HBAR tokens."
                icon={
                  <svg
                    width="64"
                    height="64"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect
                      x="2"
                      y="4"
                      width="20"
                      height="16"
                      rx="2"
                      stroke="#00FF88"
                      strokeWidth="1.5"
                    />
                    <path d="M2 10H22" stroke="#00FF88" strokeWidth="1.5" />
                    <circle
                      cx="12"
                      cy="16"
                      r="2"
                      stroke="#00FF88"
                      strokeWidth="1.5"
                    />
                  </svg>
                }
                onClick={() => {
                  router.push("/deploy-device")
                }}
              />
              <OptionCard
                title="Host Your AI Agent"
                description="Host your AI agent in any available old devices listed in the marketplace."
                icon={
                  <svg
                    width="64"
                    height="64"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 2L20 7V17L12 22L4 17V7L12 2Z"
                      stroke="#00FF88"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx="12"
                      cy="12"
                      r="3"
                      stroke="#00FF88"
                      strokeWidth="1.5"
                    />
                  </svg>
                }
                onClick={() => router.push("/marketplace")}
              />
              <OptionCard
                title="Use Public AI Agents"
                description="Access and use any of the publicly available AI agents in the Franky Ecosystem."
                icon={
                  <svg
                    width="64"
                    height="64"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z"
                      stroke="#00FF88"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M20 21C20 16.5817 16.4183 13 12 13C7.58172 13 4 16.5817 4 21"
                      stroke="#00FF88"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                }
                onClick={() => {
                  router.push("/agent-marketplace")
                }}
              />
            </div>
            <div className="mt-12 flex flex-col md:flex-row justify-center gap-6">
              <motion.button
                className="py-2 px-4 text-[#00FF88] hover:text-white border border-[#00FF88]/30 rounded-lg transition-colors duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setGetStarted(false)}
              >
                ←  Go Back
              </motion.button>
            </div>
          </motion.div>
        ) : <ChatInterface isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />}
      </div>
    </section>
  );
}

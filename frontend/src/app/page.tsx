"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/ui/Header";

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
      className="relative overflow-hidden px-8 py-4 rounded-xl bg-black/50 backdrop-blur-sm border border-[#00FF88] border-opacity-50"
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

// Feature card component
const FeatureCard = ({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) => {
  return (
    <div className="p-6 rounded-xl border border-[#00FF88] border-opacity-30 bg-black/50 backdrop-blur-sm">
      <div className="text-4xl mb-4 text-[#00FF88]">{icon}</div>
      <h3 className="text-xl font-bold mb-2 bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent">
        {title}
      </h3>
      <p className="text-[#AAAAAA]">{description}</p>
    </div>
  );
};

// Main Home component
export default function Home() {
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted to avoid hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <HeroAnimation />

      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center px-4 relative">
        <div className="container mx-auto text-center">
          <div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent">
              Green AI Agents
            </h1>
            <p className="text-xl md:text-2xl mb-10 text-[#AAAAAA] max-w-3xl mx-auto">
              Recycle your old mobile devices into AI agents and earn $FRANKY.
            </p>

            <div className="flex flex-col md:flex-row justify-center gap-6 md:gap-8">
              <GlowButton href="/agent-marketplace">
                Use a hosted agent →
              </GlowButton>

              <GlowButton href="/marketplace">Host AI Agents →</GlowButton>

              <GlowButton href="/deploy-device">
                Deploy Your Device →
              </GlowButton>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
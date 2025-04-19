"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiUser,
  FiSmartphone,
  FiDollarSign,
  FiActivity,
  FiCpu,
  FiClock,
  FiCheckCircle,
  FiArrowUpRight,
  FiArrowDownLeft,
} from "react-icons/fi";
import Header from "@/components/ui/Header";
import Image from "next/image";
import { BLACK_LISTED_ADDRESSES } from "@/lib/constants";
import { shortenAddress } from "@/lib/utils";

// Types
interface Transaction {
  id: string;
  type:
    | "create-agent"
    | "deploy-device"
    | "api-call"
    | "deposit"
    | "withdrawal";
  amount: string;
  address: string;
  timestamp: string;
  status: "completed" | "pending" | "failed";
  hash: string;
}

interface TokenHolder {
  address: string;
  balance: number;
  percentage: number;
}

// Mock data
const initialTransactions: Transaction[] = [
  {
    id: "1",
    type: "create-agent",
    amount: "5.0",
    address: "0x1234...5678",
    timestamp: "2 mins ago",
    status: "completed",
    hash: "0x8901...2345",
  },
  {
    id: "2",
    type: "deploy-device",
    amount: "10.0",
    address: "0xabcd...efgh",
    timestamp: "15 mins ago",
    status: "completed",
    hash: "0x6789...0123",
  },
  {
    id: "3",
    type: "api-call",
    amount: "0.5",
    address: "0x4567...8901",
    timestamp: "32 mins ago",
    status: "completed",
    hash: "0x3456...7890",
  },
  {
    id: "4",
    type: "deposit",
    amount: "20.0",
    address: "0xfedc...ba98",
    timestamp: "1 hour ago",
    status: "completed",
    hash: "0x2345...6789",
  },
  {
    id: "5",
    type: "withdrawal",
    amount: "8.0",
    address: "0x9876...5432",
    timestamp: "3 hours ago",
    status: "completed",
    hash: "0x1234...5678",
  },
];

const kpiData = {
  totalDevices: "128",
  totalAgents: "356",
  totalRevenue: "4,850",
};

// Helper function to get icon based on transaction type
const getTransactionIcon = (type: Transaction["type"]) => {
  switch (type) {
    case "create-agent":
      return <FiCpu className="text-blue-400" />;
    case "deploy-device":
      return <FiSmartphone className="text-purple-400" />;
    case "api-call":
      return <FiActivity className="text-green-400" />;
    case "deposit":
      return <FiArrowDownLeft className="text-emerald-400" />;
    case "withdrawal":
      return <FiArrowUpRight className="text-orange-400" />;
    default:
      return <FiActivity className="text-gray-400" />;
  }
};

// Helper function to get status color
const getStatusColor = (status: Transaction["status"]) => {
  switch (status) {
    case "completed":
      return "text-[#00FF88]";
    case "pending":
      return "text-yellow-400";
    case "failed":
      return "text-red-400";
    default:
      return "text-gray-400";
  }
};

export default function AppDashboard() {
  const [transactions, setTransactions] =
    useState<Transaction[]>(initialTransactions);

  const [holders, setHolders] = useState([] as TokenHolder[]);
  const [supply, setSupply] = useState(0);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");

  useEffect(() => {
    const fetchHolders = async () => {
      const response = await fetch("/api/get-holders");
      const {
        holders,
        totalSupply,
        name: fetchedName,
        symbol: fetchedSymbol,
      } = await response.json();
      const filteredHolders = holders.filter(
        (holder: any) =>
          !BLACK_LISTED_ADDRESSES.includes(holder.address.toLowerCase())
      );
      setHolders(filteredHolders);
      setSupply(totalSupply);
      setName(fetchedName);
      setSymbol(fetchedSymbol);
    };

    fetchHolders();
  }, []);

  // Effect to simulate adding new transactions
  useEffect(() => {
    const interval = setInterval(() => {
      const newTransaction: Transaction = {
        id: Math.random().toString(36).substring(2, 9),
        type: [
          "create-agent",
          "deploy-device",
          "api-call",
          "deposit",
          "withdrawal",
        ][Math.floor(Math.random() * 5)] as Transaction["type"],
        amount: (Math.random() * 20).toFixed(1),
        address: `0x${Math.random()
          .toString(16)
          .substring(2, 6)}...${Math.random().toString(16).substring(2, 6)}`,
        timestamp: "Just now",
        status: Math.random() > 0.9 ? "pending" : "completed",
        hash: `0x${Math.random().toString(16).substring(2, 6)}...${Math.random()
          .toString(16)
          .substring(2, 6)}`,
      };

      setTransactions((prev) => [newTransaction, ...prev.slice(0, 9)]);
    }, 15000); // Add new transaction every 15 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <div className="min-h-screen pb-16 relative">
        <Header />

        <main className="container mx-auto px-4 pt-32">
          <div className="flex w-full justify-between">
            <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent">
              Franky Agents ($FRANKY)
            </h1>
            <div className="flex space-x-3 items-center">
              <p className="font-semibold text-gray-300">Powered by</p>
              <Image
                src={"/nodit.png"}
                alt="nodit"
                width={40}
                height={40}
                className="rounded-full"
              />
              <Image
                src={"/metal.png"}
                alt="metal"
                width={40}
                height={40}
                className="rounded-full"
              />
            </div>
          </div>

          {/* KPI Section */}
          <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
            <motion.div
              className="p-6 rounded-xl bg-black/50 backdrop-blur-sm border border-[#00FF88]/30"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-[#00FF88]/20 mr-4">
                  <FiSmartphone className="text-[#00FF88] text-xl" />
                </div>
                <div>
                  <h3 className="text-gray-400 text-sm">Total Supply</h3>
                  <p className="text-3xl font-bold text-white">
                    {kpiData.totalDevices}
                  </p>
                </div>
              </div>
            </motion.div>
            <motion.div
              className="p-6 rounded-xl bg-black/50 backdrop-blur-sm border border-[#00FF88]/30"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-[#00FF88]/20 mr-4">
                  <FiSmartphone className="text-[#00FF88] text-xl" />
                </div>
                <div>
                  <h3 className="text-gray-400 text-sm">Total Devices</h3>
                  <p className="text-3xl font-bold text-white">
                    {kpiData.totalDevices}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="p-6 rounded-xl bg-black/50 backdrop-blur-sm border border-[#00FF88]/30"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-[#00FF88]/20 mr-4">
                  <FiCpu className="text-[#00FF88] text-xl" />
                </div>
                <div>
                  <h3 className="text-gray-400 text-sm">Total Agents</h3>
                  <p className="text-3xl font-bold text-white">
                    {kpiData.totalAgents}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              className="p-6 rounded-xl bg-black/50 backdrop-blur-sm border border-[#00FF88]/30"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-[#00FF88]/20 mr-4">
                  <FiDollarSign className="text-[#00FF88] text-xl" />
                </div>
                <div>
                  <h3 className="text-gray-400 text-sm">Total Revenue</h3>
                  <p className="text-3xl font-bold text-white">
                    ${kpiData.totalRevenue}
                  </p>
                </div>
              </div>
            </motion.div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Transactions Section - Now Vertical */}
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-bold text-white mb-4">
                Recent Transactions
              </h2>

              <div className="space-y-4">
                <AnimatePresence>
                  {transactions.map((tx) => (
                    <motion.div
                      key={tx.id}
                      className="p-4 rounded-lg bg-black/50 backdrop-blur-sm border border-[#00FF88]/20 w-full"
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.5 }}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center">
                          <div className="p-2 rounded-md bg-[#00FF88]/10 mr-3">
                            {getTransactionIcon(tx.type)}
                          </div>
                          <div>
                            <h3 className="font-medium text-white capitalize">
                              {tx.type.replace("-", " ")}
                            </h3>
                            <p className="text-xs text-gray-400">
                              {tx.timestamp}
                            </p>
                          </div>
                        </div>
                        <div
                          className={`px-2 py-1 rounded-full text-xs flex items-center ${
                            tx.status === "completed"
                              ? "bg-[#00FF88]/10"
                              : tx.status === "pending"
                              ? "bg-yellow-500/10"
                              : "bg-red-500/10"
                          }`}
                        >
                          {tx.status === "completed" ? (
                            <FiCheckCircle className="mr-1 text-[#00FF88]" />
                          ) : (
                            <FiClock className="mr-1 text-yellow-400" />
                          )}
                          <span className={getStatusColor(tx.status)}>
                            {tx.status}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                            <span className="text-xs text-gray-400">
                              Amount
                            </span>
                            <span className="text-sm font-medium text-white">
                              {tx.amount} $FRANKY
                            </span>
                          </div>
                        </div>

                        <div>
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                            <span className="text-xs text-gray-400">
                              Address
                            </span>
                            <span className="text-sm font-medium text-white">
                              {tx.address}
                            </span>
                          </div>
                        </div>

                        <div>
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                            <span className="text-xs text-gray-400">
                              Tx Hash
                            </span>
                            <a
                              href={`https://basescan.org/tx/${tx.hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#00FF88] hover:underline"
                            >
                              {tx.hash}
                            </a>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Top Token Holders - Updated without percentages */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-4">
                Top $FRANKY Holders
              </h2>

              <div className="bg-black/50 backdrop-blur-sm border border-[#00FF88]/20 rounded-xl p-4">
                {holders.length > 0 ? (
                  holders.map((holder, idx) => (
                    <motion.div
                      key={holder.address}
                      className={`py-3 ${
                        idx !== holders.length - 1
                          ? "border-b border-[#00FF88]/10"
                          : ""
                      }`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.05 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex justify-center items-center h-8 w-8 rounded-full bg-[#00FF88]/20 text-[#00FF88] mr-3">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="text-sm text-white">
                              {shortenAddress(holder.address)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium text-[#00FF88]">
                            {holder.balance.toLocaleString()} $FRANKY
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="h-[100px] flex justify-center items-center">
                    <p className="text-gray-400">No holders yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

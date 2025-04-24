'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Header from '@/components/ui/Header'
import { Server, Shield, Clock } from 'lucide-react'
import GlowButton from '@/components/ui/GlowButton'
import { useWalletInterface } from '@/hooks/use-wallet-interface'

export default function RegisterChecker() {
  const [isRegistering, setIsRegistering] = useState(false)
  const [registrationComplete, setRegistrationComplete] = useState(false)
  const [serverUrl, setServerUrl] = useState('')
  const { accountId } = useWalletInterface()
  const handleRegister = async () => {
    if (!accountId || !serverUrl) return;
    setIsRegistering(true);

    try {
      const response = await fetch('/api/register-checker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: accountId,
          serverUrl: serverUrl
        }),
      });

      if (response.ok) {
        setRegistrationComplete(true);
      } else {
        throw new Error('Registration failed');
      }
    } catch (error) {
      console.error('Error registering checker:', error);
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <> <section className="pt-32 px-6">
      <div className="container mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl md:text-6xl font-bold mb-8 bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent">
            Become a Checker Node
          </h1>
          <p className="text-xl mb-12 text-[#AAAAAA] max-w-4xl mx-auto">
            Join the Checker Network and help verify device reliability.
          </p>
        </motion.div>
      </div>
    </section>

      <section className="py-10 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-black/50 backdrop-blur-sm border border-[#00FF88]/30 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-[#00FF88] mb-6">
              Register Your Node
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Your Server URL
                </label>
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  placeholder="https://your-server-url.com"
                  className="w-full p-3 bg-black/70 border border-[#00FF88]/20 rounded-lg text-white focus:border-[#00FF88]/50 focus:outline-none"
                />
                <p className="mt-2 text-sm text-gray-400">
                  This is where your checker node will run. Must be accessible via HTTPS.
                </p>
              </div>

              <div className="pt-4">
                <GlowButton
                  onClick={handleRegister}
                  disabled={!accountId || isRegistering || !serverUrl}
                  className="w-full"
                >
                  {isRegistering ? 'Registering...' : 'Register Checker Node'}
                </GlowButton>
              </div>

              {registrationComplete && (
                <div className="mt-4 p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-lg">
                  <p className="text-emerald-400">Registration successful! Follow these steps to start your node:</p>
                  <ol className="mt-4 space-y-4 text-gray-300">
                    <li className="flex items-start">
                      <span className="flex-shrink-0 h-6 w-6 rounded-full bg-emerald-900/50 flex items-center justify-center mr-3">1</span>
                      <div>
                        <p className="font-medium">Clone the repository:</p>
                        <code className="block mt-2 p-2 bg-black/50 rounded">
                          git clone https://github.com/your-repo/franky.git
                        </code>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="flex-shrink-0 h-6 w-6 rounded-full bg-emerald-900/50 flex items-center justify-center mr-3">2</span>
                      <div>
                        <p className="font-medium">Install dependencies:</p>
                        <code className="block mt-2 p-2 bg-black/50 rounded">
                          npm install
                        </code>
                      </div>
                    </li>
                    <li className="flex items-start">
                      <span className="flex-shrink-0 h-6 w-6 rounded-full bg-emerald-900/50 flex items-center justify-center mr-3">3</span>
                      <div>
                        <p className="font-medium">Start your checker node:</p>
                        <code className="block mt-2 p-2 bg-black/50 rounded">
                          npm run check-devices
                        </code>
                      </div>
                    </li>
                  </ol>
                </div>
              )}
            </div>
          </div>

          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <div className="p-6 bg-black/50 backdrop-blur-sm border border-[#00FF88]/30 rounded-xl">
              <Server className="w-8 h-8 text-[#00FF88] mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Earn Rewards</h3>
              <p className="text-gray-400">
                Earn rewards for each successful device verification you perform.
              </p>
            </div>

            <div className="p-6 bg-black/50 backdrop-blur-sm border border-[#00FF88]/30 rounded-xl">
              <Shield className="w-8 h-8 text-[#00FF88] mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Build Trust</h3>
              <p className="text-gray-400">
                Help build a trustless verification layer for the Franky network.
              </p>
            </div>

            <div className="p-6 bg-black/50 backdrop-blur-sm border border-[#00FF88]/30 rounded-xl">
              <Clock className="w-8 h-8 text-[#00FF88] mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">Flexible Schedule</h3>
              <p className="text-gray-400">
                Run your node when you want, minimum uptime requirements apply.
              </p>
            </div>
          </div>
        </div>
      </section></>
  )
} 
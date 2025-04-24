import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { connectToMetamask } from "@/services/metamask";
import { openWalletConnectModal } from "@/services/walletconnect";

interface WalletSelectionDialogProps {
    open: boolean;
    setOpen: (value: boolean) => void;
    onClose: (value: string) => void;
}

export const WalletSelectionDialog = (props: WalletSelectionDialogProps) => {
    const { onClose, open, setOpen } = props;
    const [hoveredWallet, setHoveredWallet] = useState<string | null>(null);

    const handleClose = () => {
        setOpen(false);
        onClose('');
    };

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            onClick={(e) => e.stopPropagation()}
                            className="relative max-w-md w-full rounded-xl border border-[#00FF88] border-opacity-50 bg-black/90 backdrop-blur-sm p-5"
                        >
                            <button
                                onClick={handleClose}
                                className="absolute top-3 right-3 text-gray-400 hover:text-white h-7 w-7 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/70 transition-colors"
                                aria-label="Close modal"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>

                            <h3 className="text-xl font-bold bg-gradient-to-r from-[#00FF88] to-emerald-400 bg-clip-text text-transparent mb-6 pr-8">
                                Connect Wallet
                            </h3>

                            <div className="space-y-3">
                                {/* WalletConnect button */}
                                <motion.button
                                    onClick={() => {
                                        openWalletConnectModal();
                                        setOpen(false);
                                    }}
                                    onMouseEnter={() => setHoveredWallet('walletconnect')}
                                    onMouseLeave={() => setHoveredWallet(null)}
                                    className={`w-full flex items-center justify-start p-4 rounded-lg border transition-all duration-300 ${hoveredWallet === 'walletconnect'
                                        ? 'border-[#00FF88] bg-[#00FF88]/10'
                                        : 'border-[#00FF88]/30 bg-black/50'
                                        }`}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 flex items-center justify-center">
                                            <img
                                                src="/walletconnect.png"
                                                alt="walletconnect logo"
                                                className="w-8 h-8 object-contain rounded-full"
                                            />
                                        </div>
                                        <span className={`text-lg font-medium ${hoveredWallet === 'walletconnect' ? 'text-[#00FF88]' : 'text-white'
                                            }`}>
                                            WalletConnect
                                        </span>
                                    </div>
                                </motion.button>

                                {/* MetaMask button */}
                                <motion.button
                                    onClick={() => {
                                        connectToMetamask();
                                        setOpen(false);
                                    }}
                                    onMouseEnter={() => setHoveredWallet('metamask')}
                                    onMouseLeave={() => setHoveredWallet(null)}
                                    className={`w-full flex items-center justify-start p-4 rounded-lg border transition-all duration-300 ${hoveredWallet === 'metamask'
                                        ? 'border-[#00FF88] bg-[#00FF88]/10'
                                        : 'border-[#00FF88]/30 bg-black/50'
                                        }`}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 flex items-center justify-center">
                                            <img
                                                src="/metamask.png"
                                                alt="metamask logo"
                                                className="w-8 h-8 object-contain rounded-full"
                                            />
                                        </div>
                                        <span className={`text-lg font-medium ${hoveredWallet === 'metamask' ? 'text-[#00FF88]' : 'text-white'
                                            }`}>
                                            MetaMask
                                        </span>
                                    </div>
                                </motion.button>
                            </div>

                            <p className="mt-6 text-xs text-gray-400 text-center">
                                Choose a wallet to connect to Franky Agents
                            </p>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
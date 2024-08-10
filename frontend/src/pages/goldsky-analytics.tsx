import React from 'react';
import { useBlockchain } from '../hooks/useBlockchain';
import FuturisticBackground from '../components/FuturisticBackground';
import GoldskyAnalytics from '../components/GoldskyAnalytics';
import Link from 'next/link';

const GoldskyAnalyticsPage = () => {
  const { address, connect, disconnect, chainId, switchNetwork } = useBlockchain();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 text-white p-8">
      <FuturisticBackground />
      <div className="container mx-auto">
        <Link href="/" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
          &larr; Back to Home
        </Link>
        <h1 className="text-4xl font-bold mb-8 text-center">Goldsky Memecoin Analytics</h1>
        
        <div className="mb-8">
          {!address ? (
            <button
              onClick={connect}
              className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-4 rounded-full transition duration-300 ease-in-out transform hover:scale-105"
            >
              Connect Wallet
            </button>
          ) : (
            <div className="flex justify-between items-center">
              <span>Connected: {address.slice(0, 6)}...{address.slice(-4)}</span>
              <button
                onClick={disconnect}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full transition duration-300 ease-in-out transform hover:scale-105"
              >
                Disconnect
              </button>
            </div>
          )}
        </div>

        <GoldskyAnalytics />
      </div>
    </div>
  );
};

export default GoldskyAnalyticsPage;
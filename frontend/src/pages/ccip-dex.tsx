import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useAccount, useNetwork, useContract, useSigner } from 'wagmi';
import { CCIPCrossChainDEX } from '../contracts/CCIPCrossChainDEX';
import FuturisticBackground from '../components/FuturisticBackground';
import GlowingButton from '../components/GlowingButton';
import Link from 'next/link';

const CCIPDEXPage = () => {
  const { address } = useAccount();
  const { chain } = useNetwork();
  const { data: signer } = useSigner();
  const [sourceToken, setSourceToken] = useState('');
  const [destinationChain, setDestinationChain] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const dexContract = useContract({
    address: process.env.NEXT_PUBLIC_CCIP_DEX_ADDRESS,
    abi: CCIPCrossChainDEX.abi,
    signerOrProvider: signer,
  });

  const handleSwap = async () => {
    if (!dexContract || !address) return;

    setIsLoading(true);
    setError('');

    try {
      const tx = await dexContract.transferTokens(
        destinationChain,
        address,
        sourceToken,
        ethers.utils.parseEther(amount),
        { value: ethers.utils.parseEther('0.1') } // Example CCIP fee
      );

      await tx.wait();
      alert('Cross-chain swap initiated!');
    } catch (err) {
      console.error(err);
      setError('Failed to initiate cross-chain swap');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 text-white p-8">
      <FuturisticBackground />
      <div className="container mx-auto max-w-2xl">
        <Link href="/" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
          &larr; Back to Home
        </Link>
        <h1 className="text-4xl font-bold mb-8 text-center">CCIP Cross-Chain DEX</h1>
        
        <div className="bg-white bg-opacity-10 p-6 rounded-xl shadow-lg">
          <h2 className="text-2xl font-semibold mb-4">Swap Tokens Across Chains</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Source Token</label>
              <input
                type="text"
                value={sourceToken}
                onChange={(e) => setSourceToken(e.target.value)}
                className="w-full bg-gray-700 text-white p-2 rounded"
                placeholder="Token Address"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Destination Chain</label>
              <input
                type="text"
                value={destinationChain}
                onChange={(e) => setDestinationChain(e.target.value)}
                className="w-full bg-gray-700 text-white p-2 rounded"
                placeholder="Chain Selector"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Amount</label>
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-gray-700 text-white p-2 rounded"
                placeholder="Amount to swap"
              />
            </div>

            <GlowingButton
              onClick={handleSwap}
              disabled={isLoading || !sourceToken || !destinationChain || !amount}
              className="w-full"
            >
              {isLoading ? 'Swapping...' : 'Swap Across Chains'}
            </GlowingButton>

            {error && (
              <p className="text-red-500 mt-2">{error}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CCIPDEXPage;
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { EvmPriceServiceConnection } from '@pythnetwork/pyth-evm-js';
import { ethers } from 'ethers';
import { useBlockchain } from '../hooks/useBlockchain';
import GlowingButton from './GlowingButton';

const PythDEX = () => {
  const { signer, address } = useBlockchain();
  const [fromToken, setFromToken] = useState('ETH');
  const [toToken, setToToken] = useState('USDC');
  const [amount, setAmount] = useState('');
  const [estimatedOutput, setEstimatedOutput] = useState('0');
  const [prices, setPrices] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const supportedTokens = ['ETH', 'USDC', 'BTC', 'SOL'];
  const pythPriceIds = {
    'ETH': '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
    'USDC': '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a',
    'BTC': '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
    'SOL': '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  };

  useEffect(() => {
    const connection = new EvmPriceServiceConnection(
      'https://xc-mainnet.pyth.network'
    );
    
    const updatePrices = async () => {
      try {
        const priceFeeds = await connection.getLatestPriceFeeds(Object.values(pythPriceIds));
        const newPrices = {};
        priceFeeds.forEach(priceFeed => {
          const token = Object.keys(pythPriceIds).find(key => pythPriceIds[key] === priceFeed.id);
          newPrices[token] = priceFeed.price.price;
        });
        setPrices(newPrices);
      } catch (err) {
        console.error('Error fetching Pyth prices:', err);
        setError('Failed to fetch price data');
      }
    };

    updatePrices();
    const intervalId = setInterval(updatePrices, 10000); // Update every 10 seconds

    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (amount && prices[fromToken] && prices[toToken]) {
      const fromAmount = parseFloat(amount);
      const fromPrice = parseFloat(prices[fromToken]);
      const toPrice = parseFloat(prices[toToken]);
      const estimated = (fromAmount * fromPrice) / toPrice;
      setEstimatedOutput(estimated.toFixed(6));
    } else {
      setEstimatedOutput('0');
    }
  }, [amount, fromToken, toToken, prices]);

  const handleSwap = async () => {
    if (!signer || !address) {
      setError('Please connect your wallet');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // Here you would typically interact with your smart contract to perform the swap
      // For this example, we'll just simulate a successful swap
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate blockchain delay
      setIsLoading(false);
      alert(`Swap successful! You received ${estimatedOutput} ${toToken}`);
      setAmount('');
    } catch (err) {
      console.error('Swap error:', err);
      setError('Failed to perform swap');
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white bg-opacity-10 p-6 rounded-xl shadow-lg"
    >
      <h2 className="text-2xl font-semibold mb-4">Swap Tokens</h2>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">From</label>
        <div className="flex space-x-2">
          <select
            value={fromToken}
            onChange={(e) => setFromToken(e.target.value)}
            className="flex-grow bg-gray-700 text-white p-2 rounded"
          >
            {supportedTokens.map(token => (
              <option key={token} value={token}>{token}</option>
            ))}
          </select>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            className="flex-grow bg-gray-700 text-white p-2 rounded"
          />
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">To</label>
        <div className="flex space-x-2">
          <select
            value={toToken}
            onChange={(e) => setToToken(e.target.value)}
            className="flex-grow bg-gray-700 text-white p-2 rounded"
          >
            {supportedTokens.map(token => (
              <option key={token} value={token}>{token}</option>
            ))}
          </select>
          <input
            type="text"
            value={estimatedOutput}
            readOnly
            className="flex-grow bg-gray-700 text-white p-2 rounded"
          />
        </div>
      </div>
      <div className="mb-4">
        <p className="text-sm">
          1 {fromToken} = {prices[fromToken] ? (prices[toToken] / prices[fromToken]).toFixed(6) : '...'} {toToken}
        </p>
      </div>
      <GlowingButton
        onClick={handleSwap}
        disabled={isLoading || !amount || fromToken === toToken}
        className="w-full"
      >
        {isLoading ? 'Swapping...' : 'Swap'}
      </GlowingButton>
      {error && (
        <p className="text-red-500 mt-2">{error}</p>
      )}
    </motion.div>
  );
};

export default PythDEX;
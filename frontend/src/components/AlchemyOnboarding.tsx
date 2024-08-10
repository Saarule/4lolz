import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Alchemy, Network } from 'alchemy-sdk';
import { ethers } from 'ethers';
import { createAlchemyWeb3 } from "@alch/alchemy-web3";
import OnboardingChoiceModal from './OnboardingChoiceModal';

const AlchemyOnboarding = () => {
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState('0');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [onboardingMethod, setOnboardingMethod] = useState(null);

  const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
  const ALCHEMY_NETWORK = Network.MATIC_MUMBAI;

  const handleOnboardingChoice = (choice) => {
    setOnboardingMethod(choice);
    setIsModalOpen(false);
    if (choice === 'alchemy') {
      createAlchemyAccount();
    } else if (choice === 'thirdweb') {
      console.log('Thirdweb onboarding chosen');
    }
  };

  const createAlchemyAccount = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Create a Web3 instance using Alchemy
      const web3 = createAlchemyWeb3(
        `https://polygon-mumbai.g.alchemy.com/v2/${ALCHEMY_API_KEY}`
      );

      // Create a new account
      const newAccount = web3.eth.accounts.create();

      // Set the account state
      setAccount({
        address: newAccount.address,
        privateKey: newAccount.privateKey,
      });

      // Fetch the balance
      await fetchBalance(newAccount.address);
    } catch (err) {
      console.error('Error creating account:', err);
      setError('Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBalance = async (address) => {
    const alchemy = new Alchemy({
      apiKey: ALCHEMY_API_KEY,
      network: ALCHEMY_NETWORK,
    });

    try {
      const balance = await alchemy.core.getBalance(address);
      setBalance(ethers.utils.formatEther(balance));
    } catch (err) {
      console.error('Error fetching balance:', err);
      setError('Failed to fetch balance');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white bg-opacity-10 p-6 rounded-xl shadow-lg"
    >
      <h2 className="text-2xl font-semibold mb-4">Create Your Account</h2>
      {!account ? (
        <button
          onClick={() => setIsModalOpen(true)}
          disabled={isLoading}
          className="w-full mb-4 py-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Creating Account...' : 'Choose Onboarding Method'}
        </button>
      ) : (
        <div>
          <p className="mb-2">Account Created Successfully!</p>
          <p className="mb-2">Address: {account.address}</p>
          <p>Balance: {balance} MATIC</p>
          <p className="text-sm text-red-500 mt-2">
            Important: Store your private key securely. Never share it with anyone.
          </p>
        </div>
      )}
      {error && (
        <p className="text-red-500 mt-2">{error}</p>
      )}
      <OnboardingChoiceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onChoose={handleOnboardingChoice}
      />
    </motion.div>
  );
};

export default AlchemyOnboarding;
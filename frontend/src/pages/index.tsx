import React, { useState, useEffect } from 'react';
import { useBlockchain } from '../hooks/useBlockchain';
import MemeForm from '../components/MemeForm';
import MemecoinDashboard from '../components/MemecoinDashboard';
import ErrorDisplay from '../components/ErrorDisplay';
import { chainConfig } from '../utils/chainConfig';

export default function Home() {
  const { connect, chainId } = useBlockchain();
  const [error, setError] = useState<string | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);

  useEffect(() => {
    connect().catch((err) => {
      setError("Failed to connect. Please make sure MetaMask is installed and connected to the correct network.");
    });
  }, [connect]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white bg-opacity-10 p-8 rounded-2xl shadow-2xl backdrop-blur-lg w-full max-w-4xl">
        <h1 className="text-4xl font-bold mb-6 text-center text-white">Memecoin Generator</h1>
        {chainId && (
          <p className="text-white text-center mb-4">
            Connected to: {chainConfig[chainId]?.chainName || `Chain ID ${chainId}`}
          </p>
        )}
        <ErrorDisplay error={error} />
        <div className="flex justify-center mb-6">
          <button
            onClick={() => setShowDashboard(!showDashboard)}
            className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded transition duration-300 ease-in-out"
          >
            {showDashboard ? 'Create Memecoin' : 'View Dashboard'}
          </button>
        </div>
        {showDashboard ? <MemecoinDashboard /> : <MemeForm />}
      </div>
    </div>
  );
}
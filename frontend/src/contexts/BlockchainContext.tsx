import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { ethers } from 'ethers';
import { chainConfig } from '../utils/chainConfig';
import { CONTRACT_ADDRESSES } from '../utils/contractAddresses';
import { MemeTokenFactoryABI } from '../utils/ABIs';

interface BlockchainContextType {
  provider: ethers.providers.Web3Provider | null;
  signer: ethers.Signer | null;
  contract: ethers.Contract | null;
  chainId: number | null;
  address: string | null;
  connect: () => Promise<void>;
  createMemeToken: (name: string, symbol: string, initialSupply: string, memeUri: string, description: string) => Promise<void>;
}

export const BlockchainContext = createContext<BlockchainContextType | null>(null);

export const BlockchainProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const initialize = useCallback(async () => {
    if (typeof window.ethereum !== 'undefined' && !isInitialized) {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const newProvider = new ethers.providers.Web3Provider(window.ethereum);
        const newSigner = newProvider.getSigner();
        const network = await newProvider.getNetwork();
        const newAddress = await newSigner.getAddress();

        console.log('Connected to network:', network);
        console.log('Connected address:', newAddress);

        setChainId(network.chainId);
        setProvider(newProvider);
        setSigner(newSigner);
        setAddress(newAddress);

        if (CONTRACT_ADDRESSES[network.chainId]) {
          const contractAddress = CONTRACT_ADDRESSES[network.chainId];
          console.log('Creating contract instance at address:', contractAddress);
          const newContract = new ethers.Contract(contractAddress, MemeTokenFactoryABI, newSigner);
          setContract(newContract);
          console.log('Contract instance created');
        } else {
          console.error(`Unsupported network: ${chainConfig[network.chainId]?.chainName || network.chainId}`);
          throw new Error(`Unsupported network: ${chainConfig[network.chainId]?.chainName || network.chainId}`);
        }

        setIsInitialized(true);
      } catch (error) {
        console.error("Failed to initialize:", error);
        throw error;
      }
    }
  }, [isInitialized]);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const connect = useCallback(async () => {
    if (!isInitialized) {
      await initialize();
    }
  }, [isInitialized, initialize]);

  const createMemeToken = useCallback(async (name: string, symbol: string, initialSupply: string, memeUri: string, description: string) => {
    if (!contract || !signer) {
      throw new Error("Wallet not connected. Please connect your wallet first.");
    }
    try {
      console.log("Creating meme token with params:", { name, symbol, initialSupply, memeUri, description });
      
      let initialSupplyWei = ethers.utils.parseUnits(initialSupply, 18);
      console.log("Initial supply in Wei:", initialSupplyWei.toString());
  
      const tx = await contract.createMemeToken(
        name,
        symbol,
        initialSupplyWei,
        memeUri,
        description,
        {
          gasLimit: ethers.utils.hexlify(5000000) // Increase gas limit
        }
      );
      
      console.log("Transaction sent:", tx.hash);
      
      const receipt = await tx.wait();
      console.log("Transaction receipt:", receipt);
      
      if (receipt.status === 0) {
        throw new Error("Transaction failed. The contract reverted the transaction.");
      }
      
      console.log("Meme token created successfully!");
    } catch (error: any) {
      console.error("Error creating meme token:", error);
      if (error.reason) {
        throw new Error(`Contract error: ${error.reason}`);
      } else if (error.message) {
        throw new Error(`Error: ${error.message}`);
      } else {
        throw new Error("An unknown error occurred");
      }
    }
  }, [contract, signer]);

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
      window.ethereum.on('accountsChanged', () => {
        window.location.reload();
      });
    }
  }, []);

  return (
    <BlockchainContext.Provider value={{ provider, signer, contract, chainId, address, connect, createMemeToken }}>
      {children}
    </BlockchainContext.Provider>
  );
};
import { useContext } from 'react';
import { BlockchainContext } from '../contexts/BlockchainContext';

export const useBlockchain = () => {
  const context = useContext(BlockchainContext);
  if (context === null) {
    throw new Error('useBlockchain must be used within a BlockchainProvider');
  }
  return context;
};

import React from 'react';
import { chainConfig } from '../utils/chainConfig';

interface ChainSelectorProps {
  selectedChain: number;
  onSelectChain: (chainId: number) => void;
}

const ChainSelector: React.FC<ChainSelectorProps> = ({ selectedChain, onSelectChain }) => {
  return (
    <select
      value={selectedChain}
      onChange={(e) => onSelectChain(Number(e.target.value))}
      className="w-full p-2 mb-4 border rounded"
    >
      {Object.entries(chainConfig).map(([chainId, { chainName }]) => (
        <option key={chainId} value={chainId}>
          {chainName}
        </option>
      ))}
    </select>
  );
};

export default ChainSelector;
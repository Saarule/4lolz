export interface ChainConfig {
  chainName: string;
  rpcUrl: string;
  blockExplorerUrl: string;
}

export const chainConfig: Record<number, ChainConfig> = {
  11155420: {
    chainName: 'Optimism Sepolia',
    rpcUrl: 'https://sepolia.optimism.io',
    blockExplorerUrl: 'https://sepolia-optimism.etherscan.io/',
  },
  36630: {
    chainName: '4LoLZ Testnet',
    rpcUrl: 'https://rpc-test-2-f4ko9l2lxm.t.conduit.xyz',
    blockExplorerUrl: 'https://explorer-test-2-f4ko9l2lxm.t.conduit.xyz',
  },
  84532:{
    chainName: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    blockExplorerUrl: 'https://sepolia-explorer.base.org',
  },
  2522: {
    chainName: 'Fraxtal Testnet L2',
    rpcUrl: 'https://rpc.testnet.frax.com',
    blockExplorerUrl: 'https://holesky.fraxscan.com',
  },
  919: {
    chainName: 'Mode Testnet',
    rpcUrl: 'https://sepolia.mode.network',
    blockExplorerUrl: 'https://sepolia.explorer.mode.network/',
  },
  44787: {
    chainName: 'Celo Alfajores & Celo Dango',
    rpcUrl: 'https://alfajores-forno.celo-testnet.org',
    blockExplorerUrl: 'https://alfajores-blockscout.celo-testnet.org',
  },
  1740: {
    chainName: 'Metal L2 Testnet',
    rpcUrl: 'https://testnet.rpc.metall2.com',
    blockExplorerUrl: 'https://testnet.explorer.metall2.com/',
  }
  // Add more chains as needed
};

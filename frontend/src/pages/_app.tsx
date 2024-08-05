import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { BlockchainProvider } from '../contexts/BlockchainContext';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <BlockchainProvider>
      <Component {...pageProps} />
    </BlockchainProvider>
  );
}

export default MyApp;
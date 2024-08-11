import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useBlockchain } from '../hooks/useBlockchain';
import { ethers } from 'ethers';
import GlowingButton from './GlowingButton';
import { motion, AnimatePresence } from 'framer-motion';
import { Twitter, Facebook, Instagram, TrendingUp, Share2, Link, Zap, Copy, CheckCircle, DollarSign, Award, ArrowLeft, Type, Hash, FileText, Upload } from 'lucide-react';
import { chainConfig } from '../utils/chainConfig';
import { MemeTokenABI } from '../utils/ABIs';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import confetti from 'canvas-confetti';

// Define interfaces for our component's state
interface DeployedToken {
  address: string;
  name: string;
  symbol: string;
  totalSupply: string;
  memeUri: string;
}

const GoViralPage: React.FC = () => {
  const router = useRouter();
  const { address, connect, disconnect, switchNetwork, chainId, factoryContract, signer } = useBlockchain() as {
    address: string | null;
    connect: () => Promise<void>;
    disconnect: () => void;
    switchNetwork: (chainId: number) => Promise<void>;
    chainId: number | null;
    factoryContract: ethers.Contract | null;
    signer: ethers.Signer | null;
  };
  const [deployedTokens, setDeployedTokens] = useState<DeployedToken[]>([]);
  const [selectedToken, setSelectedToken] = useState<DeployedToken | null>(null);
  const [farcasterFrame, setFarcasterFrame] = useState<string>('');
  const [referralLink, setReferralLink] = useState<string>('');
  const [airdropAddresses, setAirdropAddresses] = useState<string>('');
  const [airdropAmount, setAirdropAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [viralScore, setViralScore] = useState<number>(0);
  const [frameColor, setFrameColor] = useState<string>('#4B0082');

  useEffect(() => {
    if (address) {
      setReferralLink(`https://4lolz.meme/refer/${address}`);
    }
  }, [address]);

  useEffect(() => {
    const fetchDeployedTokens = async () => {
      if (factoryContract && signer) {
        try {
          const tokenCount = await factoryContract.tokenCount();
          const tokens: DeployedToken[] = [];
          for (let i = 1; i <= tokenCount; i++) {
            const tokenAddress = await factoryContract.memeTokens(i);
            const tokenContract = new ethers.Contract(tokenAddress, MemeTokenABI, signer);
            const [name, symbol, totalSupply, memeUri] = await Promise.all([
              tokenContract.name(),
              tokenContract.symbol(),
              tokenContract.totalSupply(),
              tokenContract.memeUri()
            ]);
            tokens.push({ 
              address: tokenAddress, 
              name, 
              symbol, 
              totalSupply: ethers.utils.formatEther(totalSupply),
              memeUri
            });
          }
          setDeployedTokens(tokens);
        } catch (err) {
          console.error("Error fetching deployed tokens:", err);
          toast.error("Failed to fetch deployed tokens");
        }
      }
    };

    fetchDeployedTokens();
  }, [factoryContract, signer]);

  const getShareText = useCallback(() => {
    if (!selectedToken) return '';
    return `🚀 Check out this awesome memecoin: ${selectedToken.name} (${selectedToken.symbol})! 🎉\n\n` +
           `💰 Total Supply: ${selectedToken.totalSupply} tokens\n\n` +
           `Created with 4LoLz!\n` +
           `Make your own memecoin: https://4lolz.meme\n` +
           `View this token: https://4lolz.meme/token/${selectedToken.address}\n\n` +
           `#4LolZ #Memecoin #${selectedToken.symbol} #Meme`;
  }, [selectedToken]);

  const handleSocialShare = (platform: string) => {
    const text = encodeURIComponent(getShareText());
    const url = encodeURIComponent(`https://4lolz.meme/token/${selectedToken?.address}`);
    let shareUrl = '';

    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${text}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        break;
      case 'instagram':
        copyToClipboard(getShareText());
        toast.info("Caption copied to clipboard. Open Instagram and paste to share!");
        incrementViralScore();
        return;
      default:
        break;
    }

    if (shareUrl) {
      window.open(shareUrl, '_blank');
      incrementViralScore();
    }
  };

  const generateFarcasterFrame = async () => {
    if (!selectedToken) {
      toast.error("Please select a token first");
      return;
    }

    const frameContent = `
      <div style="background: linear-gradient(45deg, ${frameColor}, ${lightenColor(frameColor, 40)}); padding: 20px; border-radius: 15px; font-family: 'Orbitron', sans-serif; color: white; text-align: center; box-shadow: 0 0 20px rgba(75, 0, 130, 0.7);">
        <h2 style="font-size: 24px; margin-bottom: 10px; text-shadow: 0 0 10px #8A2BE2;">${selectedToken.name} (${selectedToken.symbol})</h2>
        <p style="font-size: 18px; margin-bottom: 15px;">Total Supply: ${selectedToken.totalSupply} tokens</p>
        <p style="font-size: 16px; margin-bottom: 20px;">The coolest memecoin in the multiverse! 🚀🌌</p>
        <a href="https://4lolz.meme/token/${selectedToken.address}" style="background-color: #9370DB; color: #fff; padding: 10px 20px; border-radius: 25px; text-decoration: none; font-weight: bold; transition: all 0.3s ease;">Check it out!</a>
      </div>
    `;

    setFarcasterFrame(frameContent);
    toast.success("Farcaster frame generated successfully!");
    incrementViralScore();
  };

  const publishToFarcaster = async () => {
    try {
      setIsLoading(true);
      const frameId = Math.random().toString(36).substring(7);
      const frameUrl = `https://4lolz.meme/farcaster-frame/${frameId}`;
      window.open(`https://warpcast.com/~/compose?text=${encodeURIComponent(getShareText())}&embeds[]=${encodeURIComponent(frameUrl)}`, '_blank');
      setIsLoading(false);
      toast.success("Frame ready to be published on Farcaster!");
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      incrementViralScore(5);
    } catch (err) {
      setIsLoading(false);
      toast.error("Failed to prepare Farcaster frame: " + (err as Error).message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Copied to clipboard!");
    });
  };

  const handleAirdrop = async () => {
    if (!selectedToken || !airdropAddresses || !airdropAmount) {
      toast.error("Please fill in all airdrop fields");
      return;
    }

    if (!signer) {
      toast.error("Please connect your wallet");
      return;
    }

    setIsLoading(true);

    try {
      const tokenContract = new ethers.Contract(selectedToken.address, MemeTokenABI, signer);
      const addresses = airdropAddresses.split(',').map(addr => addr.trim());
      const amount = ethers.utils.parseEther(airdropAmount);

      for (const recipient of addresses) {
        const tx = await tokenContract.transfer(recipient, amount);
        await tx.wait();
      }

      setIsLoading(false);
      toast.success("Airdrop completed successfully!");
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      incrementViralScore(10);
    } catch (err) {
      setIsLoading(false);
      toast.error("Airdrop failed: " + (err as Error).message);
    }
  };

  const incrementViralScore = (amount = 1) => {
    setViralScore(prevScore => prevScore + amount);
  };

  const lightenColor = (color: string, amount: number) => {
    return '#' + color.replace(/^#/, '').replace(/../g, color => ('0'+Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
  };

  const InputField: React.FC<{
    placeholder?: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    type?: string;
    [key: string]: any;
  }> = ({ placeholder = '', value, onChange, type = "text", ...props }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="relative flex items-center"
    >
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className="w-full bg-white bg-opacity-20 p-2 pl-10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        {...props}
      />
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 text-white p-8 font-orbitron">
      <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="dark" />
      
      <div className="absolute top-4 left-4 z-10">
        <GlowingButton onClick={() => router.back()} className="flex items-center">
          <ArrowLeft className="mr-2" /> Back
        </GlowingButton>
      </div>

      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
        {address && (
          <div className="px-4 py-2 bg-indigo-700 rounded-full text-sm">
            {address.slice(0, 6)}...{address.slice(-4)}
          </div>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto mt-16"
      >
        <h2 className="text-5xl font-bold mb-8 text-center glow-text">Meme Viral HQ</h2>

        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            className="p-4 bg-indigo-800 bg-opacity-50 rounded-xl text-center"
            whileHover={{ scale: 1.05 }}
          >
            <h3 className="text-2xl font-semibold mb-2 flex items-center justify-center">
              <Award className="mr-2" /> Viral Score
            </h3>
            <p className="text-4xl font-bold glow-text">{viralScore}</p>
          </motion.div>

          <div className="md:col-span-2 flex justify-end items-center">
            {!address ? (
              <GlowingButton onClick={connect} className="w-full md:w-auto">Connect Wallet</GlowingButton>
            ) : (
              <div className="flex space-x-4">
                <select 
                  onChange={(e) => switchNetwork(Number(e.target.value))} 
                  value={chainId || ''}
                  className="bg-indigo-800 bg-opacity-50 text-white p-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(chainConfig).map(([id, config]) => (
                    <option key={id} value={id}>{config.chainName}</option>
                  ))}
                </select>
                <GlowingButton onClick={disconnect}>Disconnect</GlowingButton>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white bg-opacity-10 p-6 rounded-xl shadow-lg backdrop-blur-sm"
          >
            <h3 className="text-2xl font-semibold mb-4 flex items-center">
              <Share2 className="mr-2" /> Share Your Memecoin
            </h3>
            <select
              value={selectedToken ? selectedToken.address : ''}
              onChange={(e) => setSelectedToken(deployedTokens.find(t => t.address === e.target.value) || null)}
              className="w-full bg-indigo-900 bg-opacity-50 text-white p-2 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a token</option>
              {deployedTokens.map((token) => (
                <option key={token.address} value={token.address}>
                  {token.name} ({token.symbol})
                </option>
              ))}
            </select>
            <div className="grid grid-cols-3 gap-4">
              {['twitter', 'facebook', 'instagram'].map((platform) => (
                <GlowingButton 
                  key={platform} 
                  onClick={() => handleSocialShare(platform)} 
                  className="flex items-center justify-center" 
                  disabled={!selectedToken}
                >
                  {platform === 'twitter' && <Twitter className="mr-2" />}
                  {platform === 'facebook' && <Facebook className="mr-2" />}
                  {platform === 'instagram' && <Instagram className="mr-2" />}
                  {platform.charAt(0).toUpperCase() + platform.slice(1)}
                </GlowingButton>
              ))}
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white bg-opacity-10 p-6 rounded-xl shadow-lg backdrop-blur-sm"
          >
            <h3 className="text-2xl font-semibold mb-4 flex items-center">
              <Link className="mr-2" /> Referral Wormhole
            </h3>
            <InputField
              placeholder="Your referral link"
              value={referralLink}
              onChange={() => {}} // Read-only
              className="w-full bg-indigo-900 bg-opacity-50 p-2 rounded-lg text-white"
              readOnly
            />
            <GlowingButton onClick={() => copyToClipboard(referralLink)} className="mt-2 w-full">
              <Copy className="mr-2" /> Copy Link
            </GlowingButton>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white bg-opacity-10 p-6 rounded-xl shadow-lg backdrop-blur-sm"
          >
            <h3 className="text-2xl font-semibold mb-4 flex items-center">
              <TrendingUp className="mr-2" /> Farcaster Frame Forge
            </h3>
            <InputField
              type="color"
              value={frameColor}
              onChange={(e) => setFrameColor(e.target.value)}
              className="w-full h-10 rounded cursor-pointer mb-4"
            />
            <GlowingButton onClick={generateFarcasterFrame} className="w-full mb-4" disabled={isLoading || !selectedToken}>
              {isLoading ? 'Generating...' : 'Forge Frame'}
            </GlowingButton>
            <AnimatePresence>
              {farcasterFrame && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div 
                    dangerouslySetInnerHTML={{ __html: farcasterFrame }} 
                    className="mb-4 border border-indigo-500 p-4 rounded"
                  />
                  <div className="flex space-x-2">
                    <GlowingButton onClick={() => copyToClipboard(farcasterFrame)} className="flex-1">
                      <Copy className="mr-2" /> Copy Frame
                    </GlowingButton>
                    <GlowingButton onClick={publishToFarcaster} className="flex-1" disabled={isLoading}>
                      <Share2 className="mr-2" /> Launch to Farcaster
                    </GlowingButton>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02 }}
            className="bg-white bg-opacity-10 p-6 rounded-xl shadow-lg backdrop-blur-sm"
          >
            <h3 className="text-2xl font-semibold mb-4 flex items-center">
              <Zap className="mr-2" /> Meme Airdrop Station
            </h3>
            <select
              value={selectedToken ? selectedToken.address : ''}
              onChange={(e) => setSelectedToken(deployedTokens.find(t => t.address === e.target.value) || null)}
              className="w-full bg-indigo-900 bg-opacity-50 text-white p-2 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a token to airdrop</option>
              {deployedTokens.map((token) => (
                <option key={token.address} value={token.address}>
                  {token.name} ({token.symbol})
                </option>
              ))}
            </select>
            <InputField
              placeholder="Enter recipient addresses (comma-separated)"
              value={airdropAddresses}
              onChange={(e) => setAirdropAddresses(e.target.value)}
              className="w-full bg-indigo-900 bg-opacity-50 p-2 rounded-lg text-white h-32 mb-4 resize-none"
            />
            <InputField
              type="text"
              placeholder="Amount to airdrop per address"
              value={airdropAmount}
              onChange={(e) => setAirdropAmount(e.target.value)}
              className="w-full bg-indigo-900 bg-opacity-50 p-2 rounded-lg text-white mb-4"
            />
            <GlowingButton onClick={handleAirdrop} className="w-full" disabled={isLoading || !selectedToken}>
              {isLoading ? 'Initiating Airdrop...' : 'Launch Airdrop'}
            </GlowingButton>
          </motion.div>
        </div>

        <motion.div
          className="mt-8 p-4 bg-white bg-opacity-10 rounded-xl backdrop-blur-sm"
          whileHover={{ scale: 1.02 }}
        >
          <h3 className="text-2xl font-semibold mb-4 flex items-center justify-center">
            <Award className="mr-2" /> Meme Viral Achievements
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'Social Butterfly', condition: viralScore >= 5, icon: <Share2 /> },
              { name: 'Meme Lord', condition: viralScore >= 10, icon: <TrendingUp /> },
              { name: 'Airdrop Master', condition: viralScore >= 20, icon: <Zap /> },
              { name: 'Viral Sensation', condition: viralScore >= 50, icon: <Award /> }
            ].map((achievement, index) => (
              <motion.div
                key={index}
                className={`p-4 rounded-lg text-center ${achievement.condition ? 'bg-green-500' : 'bg-gray-700'} transition-colors duration-300`}
                whileHover={{ scale: 1.1 }}
              >
                <div className="text-3xl mb-2">{achievement.icon}</div>
                <div className="font-semibold">{achievement.name}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="mt-8 p-4 bg-white bg-opacity-10 rounded-xl backdrop-blur-sm text-center"
          whileHover={{ scale: 1.02 }}
        >
          <h3 className="text-2xl font-semibold mb-4">Meme Viral Leaderboard</h3>
          <p className="text-lg">Coming soon! Compete with other meme enthusiasts for the top spot!</p>
        </motion.div>
      </motion.div>

      {/* Floating Action Button for Quick Share */}
      <motion.div
        className="fixed bottom-8 right-8"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <GlowingButton
          onClick={() => selectedToken && handleSocialShare('twitter')}
          className="w-16 h-16 rounded-full flex items-center justify-center"
          disabled={!selectedToken}
        >
          <Share2 size={24} />
        </GlowingButton>
      </motion.div>
    </div>
  );
};

export default GoViralPage;
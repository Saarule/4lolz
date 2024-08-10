import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useBlockchain } from '../hooks/useBlockchain';
import { chainConfig } from '../utils/chainConfig';
import FuturisticBackground from './FuturisticBackground';
import GlowingButton from './GlowingButton';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader, TrendingUp, BarChart2, ArrowDownCircle, ArrowUpCircle, RefreshCw, DollarSign, Info, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const SUPPORTED_CHAIN_IDS = Object.keys(chainConfig).map(Number);

interface VaultData {
  balance: string;
  yieldRate: string;
  totalAssets: string;
  lolBalance: string;
  lolSymbol: string;
  lolName: string;
  rwrBalance: string;
  yieldBooster: string;
  maxDepositLimit: string;
  maxWithdrawLimit: string;
  lastUpdate: number;
}

const VaultPage: React.FC = () => {
  const { vaultContract, lolTokenContract, rwrTokenContract, address, connect, disconnect, switchNetwork, chainId } = useBlockchain();
  const [vaultData, setVaultData] = useState<VaultData | null>(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [earningsHistory, setEarningsHistory] = useState<any[]>([]);
  const [compoundPeriod, setCompoundPeriod] = useState(30); // days

  useEffect(() => {
    if (chainId) {
      console.log("Connected to network:", chainId);
      if (!SUPPORTED_CHAIN_IDS.includes(chainId)) {
        console.error("Unsupported network. Please switch to a supported network.");
        toast.error("Unsupported network. Please switch to a supported network.");
      }
    }
  }, [chainId]);

  useEffect(() => {
    console.log("Contracts initialized:", {
      vaultContract: !!vaultContract,
      lolTokenContract: !!lolTokenContract,
      rwrTokenContract: !!rwrTokenContract
    });
    
    if (vaultContract && lolTokenContract && rwrTokenContract && address) {
      fetchVaultData();
    } else {
      console.log("Not all contracts or address available, skipping data fetch");
    }
  }, [vaultContract, lolTokenContract, rwrTokenContract, address]);

  const fetchVaultData = useCallback(async () => {
    console.log("Fetching vault data...");
    console.log("Contracts available:", { 
      vaultContract: !!vaultContract, 
      lolTokenContract: !!lolTokenContract,
      rwrTokenContract: !!rwrTokenContract
    });
    console.log("User address:", address);

    if (!vaultContract || !lolTokenContract || !rwrTokenContract || !address) {
      console.warn("Missing required data for fetching vault data");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const [
        balanceWei,
        yieldRateWei,
        totalAssetsWei,
        lolBalanceWei,
        lolSymbol,
        lolName,
        rwrBalanceWei,
        yieldBooster,
        maxDepositLimit,
        maxWithdrawLimit
      ] = await Promise.all([
        vaultContract.balanceOf(address),
        vaultContract.yieldRate(),
        vaultContract.totalAssets(),
        lolTokenContract.balanceOf(address),
        lolTokenContract.symbol(),
        lolTokenContract.name(),
        rwrTokenContract.balanceOf(address),
        vaultContract.yieldBooster(address),
        vaultContract.maxDepositLimit(),
        vaultContract.maxWithdrawLimit()
      ]);

      console.log("Raw data fetched:", {
        balanceWei: balanceWei.toString(),
        yieldRateWei: yieldRateWei.toString(),
        totalAssetsWei: totalAssetsWei.toString(),
        lolBalanceWei: lolBalanceWei.toString(),
        lolSymbol,
        lolName,
        rwrBalanceWei: rwrBalanceWei.toString(),
        yieldBooster: yieldBooster.toString(),
        maxDepositLimit: maxDepositLimit.toString(),
        maxWithdrawLimit: maxWithdrawLimit.toString()
      });

      const newVaultData: VaultData = {
        balance: ethers.utils.formatEther(balanceWei),
        yieldRate: ethers.utils.formatUnits(yieldRateWei, 2),
        totalAssets: ethers.utils.formatEther(totalAssetsWei),
        lolBalance: ethers.utils.formatEther(lolBalanceWei),
        lolSymbol,
        lolName,
        rwrBalance: ethers.utils.formatEther(rwrBalanceWei),
        yieldBooster: ethers.utils.formatUnits(yieldBooster, 2),
        maxDepositLimit: ethers.utils.formatEther(maxDepositLimit),
        maxWithdrawLimit: ethers.utils.formatEther(maxWithdrawLimit),
        lastUpdate: Date.now()
      };

      console.log("Processed vault data:", newVaultData);

      setVaultData(newVaultData);
      generateEarningsHistory(newVaultData.balance, newVaultData.yieldRate);

    } catch (err) {
      console.error("Error fetching vault data:", err);
      setError("Failed to fetch vault data: " + (err as Error).message);
      toast.error("Failed to fetch vault data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [vaultContract, lolTokenContract, rwrTokenContract, address]);

  const generateEarningsHistory = (balance: string, yieldRate: string) => {
    const yieldRateFloat = parseFloat(yieldRate) / 100;
    const history = [];
    let currentBalance = parseFloat(balance);

    for (let i = 0; i <= 30; i++) {
      history.push({
        day: i,
        earnings: currentBalance * yieldRateFloat,
        totalBalance: currentBalance,
      });
      currentBalance += currentBalance * yieldRateFloat;
    }

    setEarningsHistory(history);
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultContract || !lolTokenContract) return;

    try {
      setError(null);
      const amountWei = ethers.utils.parseEther(depositAmount);

      console.log("Approving LOL token spend...");
      const approveTx = await lolTokenContract.approve(vaultContract.address, amountWei);
      await approveTx.wait();
      console.log("LOL token spend approved");

      console.log("Depositing LOL tokens...");
      const depositTx = await vaultContract.deposit(amountWei, address);
      await depositTx.wait();
      console.log("Deposit successful");

      toast.success("Deposit successful!");
      setDepositAmount('');
      fetchVaultData();
    } catch (err) {
      console.error("Error during deposit:", err);
      setError("Failed to deposit: " + (err as Error).message);
      toast.error("Failed to deposit. Please try again.");
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultContract) return;

    try {
      setError(null);
      const amountWei = ethers.utils.parseEther(withdrawAmount);

      console.log("Withdrawing LOL tokens...");
      const withdrawTx = await vaultContract.withdraw(amountWei, address, address);
      await withdrawTx.wait();
      console.log("Withdrawal successful");

      toast.success("Withdrawal successful!");
      setWithdrawAmount('');
      fetchVaultData();
    } catch (err) {
      console.error("Error during withdrawal:", err);
      setError("Failed to withdraw: " + (err as Error).message);
      toast.error("Failed to withdraw. Please try again.");
    }
  };

  const handleClaimYield = async () => {
    if (!vaultContract) return;

    try {
      setError(null);
      console.log("Claiming RWR yield...");
      const claimTx = await vaultContract.claimYield();
      await claimTx.wait();
      console.log("RWR yield claimed successfully");

      toast.success("RWR yield claimed successfully!");
      fetchVaultData();
    } catch (err) {
      console.error("Error claiming RWR yield:", err);
      setError("Failed to claim RWR yield: " + (err as Error).message);
      toast.error("Failed to claim RWR yield. Please try again.");
    }
  };

  const handleWithdrawAll = async () => {
    if (!vaultContract) return;

    try {
      const balanceWei = await vaultContract.balanceOf(address);
      setWithdrawAmount(ethers.utils.formatEther(balanceWei));
    } catch (err) {
      console.error("Error setting maximum withdrawal amount:", err);
      setError("Failed to set maximum withdrawal amount: " + (err as Error).message);
      toast.error("Failed to set maximum withdrawal amount. Please try again.");
    }
  };

  const calculateRealTimeAmount = (amount: string, isDeposit: boolean) => {
    if (!amount || !vaultData) return '0';
    const amountFloat = parseFloat(amount);
    const yieldRateFloat = parseFloat(vaultData.yieldRate) / 100;
    const dailyYield = isDeposit ? amountFloat * yieldRateFloat : 0;
    return (amountFloat + dailyYield).toFixed(4);
  };

  const calculateRealTimeEarnings = () => {
    if (!vaultData) return '0';
    const balance = parseFloat(vaultData.balance);
    const yieldRate = parseFloat(vaultData.yieldRate) / 100;
    const timePassed = (Date.now() - vaultData.lastUpdate) / (1000 * 60 * 60 * 24); // in days
    return (balance * yieldRate * timePassed).toFixed(4);
  };

  const calculateCompoundInterest = () => {
    if (!vaultData) return 0;
    const principal = parseFloat(vaultData.balance);
    const rate = parseFloat(vaultData.yieldRate) / 100;
    const periods = compoundPeriod;

    return (principal * Math.pow(1 + rate, periods)).toFixed(4);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-indigo-900 text-white p-8">
      <FuturisticBackground />
      <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="dark" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="container mx-auto"
      >
        <h2 className="text-4xl font-bold mb-8 text-center glow-text">Meme Vault</h2>

        <div className="mb-4 flex justify-between items-center">
          {!address ? (
            <GlowingButton onClick={connect} className="w-full">Connect Wallet</GlowingButton>
          ) : (
            <>
              <select 
                onChange={(e) => switchNetwork(Number(e.target.value))} 
                value={chainId || ''}
                className="bg-gray-800 text-white p-2 rounded"
              >
                {SUPPORTED_CHAIN_IDS.map((id) => (
                  <option key={id} value={id}>{chainConfig[id].chainName}</option>
                ))}
              </select>
              <span>{address.slice(0, 6)}...{address.slice(-4)}</span>
              <GlowingButton onClick={disconnect}>Disconnect</GlowingButton>
            </>
          )}
        </div>

        {error && (
          <div className="bg-red-500 bg-opacity-20 border border-red-500 text-white px-4 py-3 rounded relative mb-4" role="alert">
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline"> {error}</span>
          </div>
        )}

        {isLoading ? (
          <div className="text-center">
            <Loader className="animate-spin h-10 w-10 mx-auto mb-4" />
            <p>Loading vault data...</p>
          </div>
        ) : vaultData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-white bg-opacity-10 p-6 rounded-xl shadow-lg neon-border relative"
            >
              <h3 className="text-2xl font-semibold mb-4 flex items-center">
                <BarChart2 className="mr-2" /> Vault Statistics
                <Info
                  className="ml-2 cursor-pointer"
                  onClick={() => setShowInfo(!showInfo)}
                />
              </h3>
              <AnimatePresence>
                {showInfo && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-gray-800 p-4 rounded-lg mb-4"
                  >
                    <p>This vault allows you to deposit {vaultData.lolSymbol} tokens and earn yield in RWR tokens. The yield rate is variable and can change over time. Your earnings are not automatically compounded but can be claimed as RWR tokens.</p>
                  </motion.div>
                )}
              </AnimatePresence>
              <p className="mb-2">Your Vault Balance: {parseFloat(vaultData.balance).toFixed(4)} m{vaultData.lolSymbol}</p>
              <p className="mb-2">Your {vaultData.lolSymbol} Balance: {parseFloat(vaultData.lolBalance).toFixed(4)} {vaultData.lolSymbol}</p>
              <p className="mb-2">Your RWR Balance: {parseFloat(vaultData.rwrBalance).toFixed(4)} RWR</p>
              <p className="mb-2">Total Assets in Vault: {parseFloat(vaultData.totalAssets).toFixed(4)} {vaultData.lolSymbol}</p>
              <p className="flex items-center mb-2">
                <TrendingUp className="mr-2" /> Base Yield Rate: {vaultData.yieldRate}% daily
              </p>
              <p className="flex items-center mb-2">
                <TrendingUp className="mr-2" /> Your Yield Booster: {vaultData.yieldBooster}%
              </p>
              <p className="flex items-center mb-2">
                <DollarSign className="mr-2" /> Claimable Yield: {calculateRealTimeEarnings()} RWR
              </p>
              <p className="mb-2">Max Deposit Limit: {vaultData.maxDepositLimit} {vaultData.lolSymbol}</p>
              <p className="mb-2">Max Withdraw Limit: {vaultData.maxWithdrawLimit} {vaultData.lolSymbol}</p>
              <div className="flex justify-between items-center mt-4">
                <GlowingButton onClick={fetchVaultData} className="flex items-center justify-center">
                  <RefreshCw className="mr-2" /> Refresh Data
                </GlowingButton>
                <GlowingButton onClick={handleClaimYield} className="flex items-center justify-center">
                  Claim RWR Yield
                </GlowingButton>
                <Link href={`/dex?token=${vaultData.lolSymbol}`}>
                  <GlowingButton className="flex items-center justify-center">
                    Buy {vaultData.lolSymbol} <ExternalLink className="ml-2" />
                  </GlowingButton>
                </Link>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-white bg-opacity-10 p-6 rounded-xl shadow-lg neon-border"
            >
              <h3 className="text-2xl font-semibold mb-4 flex items-center">
                <ArrowUpCircle className="mr-2" /> Deposit {vaultData.lolSymbol}
              </h3>
              <form onSubmit={handleDeposit} className="space-y-4">
                <input
                  type="text"
                  placeholder={`Amount to deposit (${vaultData.lolSymbol})`}
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full bg-white bg-opacity-20 p-2 rounded-lg text-white placeholder-gray-400 futuristic-input"
                />
                <p className="text-sm">You will receive: {depositAmount} m{vaultData.lolSymbol}</p>
                <GlowingButton type="submit" className="w-full">Deposit</GlowingButton>
              </form>

              <h3 className="text-2xl font-semibold my-4 flex items-center">
                <ArrowDownCircle className="mr-2" /> Withdraw {vaultData.lolSymbol}
              </h3>
              <form onSubmit={handleWithdraw} className="space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder={`Amount to withdraw (${vaultData.lolSymbol})`}
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full bg-white bg-opacity-20 p-2 rounded-lg text-white placeholder-gray-400 futuristic-input pr-20"
                  />
                  <button
                    type="button"
                    onClick={handleWithdrawAll}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-500 text-white px-2 py-1 rounded text-xs"
                  >
                    Max
                  </button>
                </div>
                <p className="text-sm">You will receive: {calculateRealTimeAmount(withdrawAmount, false)} {vaultData.lolSymbol}</p>
                <GlowingButton type="submit" className="w-full">Withdraw</GlowingButton>
              </form>
            </motion.div>
          </div>
        ) : (
          <div className="text-center">No vault data available</div>
        )}

        {vaultData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-white bg-opacity-10 p-6 rounded-xl shadow-lg neon-border"
            >
              <h3 className="text-2xl font-semibold mb-4">Earnings Projection</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={earningsHistory}>
                  <XAxis dataKey="day" />
                  <YAxis />
                  <RechartsTooltip />
                  <Line type="monotone" dataKey="totalBalance" stroke="#8884d8" />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-white bg-opacity-10 p-6 rounded-xl shadow-lg neon-border"
            >
              <h3 className="text-2xl font-semibold mb-4">Compound Interest Calculator</h3>
              <div className="flex items-center mb-4">
                <input
                  type="number"
                  value={compoundPeriod}
                  onChange={(e) => setCompoundPeriod(parseInt(e.target.value))}
                  className="w-1/2 bg-white bg-opacity-20 p-2 rounded-lg text-white mr-2 futuristic-input"
                />
                <span>days</span>
              </div>
              <p>
                Estimated balance after {compoundPeriod} days:
                {' '}
                {calculateCompoundInterest()} {vaultData.lolSymbol}
              </p>
            </motion.div>
          </div>
        )}
      </motion.div>
      <ReactTooltip id="global-tooltip" />
    </div>
  );
};

export default VaultPage;
import React, { useState, useEffect, useCallback } from 'react';
import { useBlockchain } from '../hooks/useBlockchain';
import { ethers } from 'ethers';
import FuturisticBackground from './FuturisticBackground';
import GlowingButton from './GlowingButton';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader, TrendingUp, BarChart2, ArrowDownCircle, ArrowUpCircle, RefreshCw, DollarSign, Info, ExternalLink, HelpCircle } from 'lucide-react';
import { chainConfig } from '../utils/chainConfig';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const VaultPage = () => {
  const { vaultContract, tokenContract, address, connect, disconnect, switchNetwork, chainId } = useBlockchain();
  const [vaultData, setVaultData] = useState(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [earningsHistory, setEarningsHistory] = useState([]);
  const [compoundPeriod, setCompoundPeriod] = useState(30); // days

  const fetchVaultData = useCallback(async () => {
    if (!vaultContract || !tokenContract || !address) return;

    try {
      setIsLoading(true);
      setError(null);

      const [balanceWei, yieldRateWei, totalAssetsWei, tokenBalanceWei, tokenSymbol, tokenName] = await Promise.all([
        vaultContract.balanceOf(address),
        vaultContract.yieldRate(),
        vaultContract.totalAssets(),
        tokenContract.balanceOf(address),
        tokenContract.symbol(),
        tokenContract.name()
      ]);

      const balanceEth = ethers.utils.formatEther(balanceWei);
      const yieldRateFormatted = ethers.utils.formatUnits(yieldRateWei, 2);
      
      const newVaultData = {
        balance: balanceEth,
        yieldRate: yieldRateFormatted,
        totalAssets: ethers.utils.formatEther(totalAssetsWei),
        tokenBalance: ethers.utils.formatEther(tokenBalanceWei),
        tokenSymbol,
        tokenName,
        lastUpdate: Date.now()
      };

      setVaultData(newVaultData);
      generateEarningsHistory(balanceEth, yieldRateFormatted);

    } catch (err) {
      console.error("Error fetching vault data:", err);
      setError("Failed to fetch vault data: " + err.message);
      toast.error("Failed to fetch vault data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [vaultContract, tokenContract, address]);

  useEffect(() => {
    fetchVaultData();
  }, [fetchVaultData]);

  const generateEarningsHistory = (balance, yieldRate) => {
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

  const handleDeposit = async (e) => {
    e.preventDefault();
    if (!vaultContract || !tokenContract) return;

    try {
      setError(null);
      const amountWei = ethers.utils.parseEther(depositAmount);

      // Approve vault to spend tokens
      const approveTx = await tokenContract.approve(vaultContract.address, amountWei);
      await approveTx.wait();

      // Deposit tokens
      const depositTx = await vaultContract.deposit(amountWei, address);
      await depositTx.wait();

      toast.success("Deposit successful!");
      setDepositAmount('');
      fetchVaultData();
    } catch (err) {
      setError("Failed to deposit: " + err.message);
      toast.error("Failed to deposit. Please try again.");
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    if (!vaultContract) return;

    try {
      setError(null);
      const amountWei = ethers.utils.parseEther(withdrawAmount);

      const withdrawTx = await vaultContract.withdraw(amountWei, address, address);
      await withdrawTx.wait();

      toast.success("Withdrawal successful!");
      setWithdrawAmount('');
      fetchVaultData();
    } catch (err) {
      setError("Failed to withdraw: " + err.message);
      toast.error("Failed to withdraw. Please try again.");
    }
  };

  const handleWithdrawAll = async () => {
    if (!vaultContract) return;

    try {
      const balanceWei = await vaultContract.balanceOf(address);
      setWithdrawAmount(ethers.utils.formatEther(balanceWei));
    } catch (err) {
      setError("Failed to set maximum withdrawal amount: " + err.message);
      toast.error("Failed to set maximum withdrawal amount. Please try again.");
    }
  };

  const calculateRealTimeAmount = (amount, isDeposit) => {
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
                {Object.entries(chainConfig).map(([id, config]) => (
                  <option key={id} value={id}>{config.chainName}</option>
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
                    <p>This vault allows you to deposit {vaultData.tokenSymbol} tokens and earn yield. The yield rate is variable and can change over time. Your earnings are automatically compounded.</p>
                  </motion.div>
                )}
              </AnimatePresence>
              <p className="mb-2">Your Vault Balance: {parseFloat(vaultData.balance).toFixed(4)} m{vaultData.tokenSymbol}</p>
              <p className="mb-2">Your Token Balance: {parseFloat(vaultData.tokenBalance).toFixed(4)} {vaultData.tokenSymbol}</p>
              <p className="mb-2">Total Assets in Vault: {parseFloat(vaultData.totalAssets).toFixed(4)} {vaultData.tokenSymbol}</p>
              <p className="flex items-center mb-2">
                <TrendingUp className="mr-2" /> Yield Rate: {vaultData.yieldRate}% daily
              </p>
              <p className="flex items-center mb-2">
                <DollarSign className="mr-2" /> Your Earnings: {calculateRealTimeEarnings()} {vaultData.tokenSymbol}
              </p>
              <div className="flex justify-between items-center mt-4">
                <GlowingButton onClick={fetchVaultData} className="flex items-center justify-center">
                  <RefreshCw className="mr-2" /> Refresh Data
                </GlowingButton>
                <Link href={`/dex?token=${vaultData.tokenSymbol}`}>
                  <GlowingButton className="flex items-center justify-center">
                    Buy {vaultData.tokenSymbol} <ExternalLink className="ml-2" />
                  </GlowingButton>
                </Link>
              </div>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-white bg-opacity-10 p-6 rounded-xl shadow-lg neon-border"
            >
              <h3 className="text-2xl font-semibold mb-4 flex items-center">
                <ArrowUpCircle className="mr-2" /> Deposit {vaultData.tokenSymbol}
              </h3>
              <form onSubmit={handleDeposit} className="space-y-4">
                <input
                  type="text"
                  placeholder={`Amount to deposit (${vaultData.tokenSymbol})`}
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full bg-white bg-opacity-20 p-2 rounded-lg text-white placeholder-gray-400 futuristic-input"
                />
                <p className="text-sm">You will receive: {calculateRealTimeAmount(depositAmount, true)} m{vaultData.tokenSymbol}</p>
                <GlowingButton type="submit" className="w-full">Deposit</GlowingButton>
              </form>

              <h3 className="text-2xl font-semibold my-4 flex items-center">
                <ArrowDownCircle className="mr-2" /> Withdraw {vaultData.tokenSymbol}
              </h3>
              <form onSubmit={handleWithdraw} className="space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder={`Amount to withdraw (${vaultData.tokenSymbol})`}
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
                <p className="text-sm">You will receive: {calculateRealTimeAmount(withdrawAmount, false)} {vaultData.tokenSymbol}</p>
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
                {calculateCompoundInterest()} {vaultData.tokenSymbol}
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
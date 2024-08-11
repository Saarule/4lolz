import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useBlockchain } from '../hooks/useBlockchain';
import { chainConfig } from '../utils/chainConfig';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader, TrendingUp, BarChart2, ArrowDownCircle, ArrowUpCircle, RefreshCw, DollarSign, Info, ExternalLink, ChevronLeft, Lock } from 'lucide-react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Tooltip as ReactTooltip } from 'react-tooltip';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useRouter } from 'next/router';

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
  depositAmount: string;
  withdrawAmount: string;
}

const VaultPage: React.FC = () => {
  const router = useRouter();
  const { vaultContract, lolTokenContract, rwrTokenContract, address, connect, disconnect, switchNetwork, chainId } = useBlockchain();
  const [vaultData, setVaultData] = useState<VaultData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [earningsHistory, setEarningsHistory] = useState<any[]>([]);
  const [compoundPeriod, setCompoundPeriod] = useState(30); // days

  const generateEarningsHistory = useCallback((balance: string, yieldRate: string) => {
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
  }, []);

  const fetchVaultData = useCallback(async () => {
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
        lastUpdate: Date.now(),
        depositAmount: '',
        withdrawAmount: ''
      };

      setVaultData(newVaultData);
      generateEarningsHistory(newVaultData.balance, newVaultData.yieldRate);

    } catch (err) {
      console.error("Error fetching vault data:", err);
      setError("Failed to fetch vault data: " + (err as Error).message);
      toast.error("Failed to fetch vault data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [vaultContract, lolTokenContract, rwrTokenContract, address, generateEarningsHistory]);

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
    if (vaultContract && lolTokenContract && rwrTokenContract && address) {
      fetchVaultData();
    } else {
      console.log("Not all contracts or address available, skipping data fetch");
    }
  }, [vaultContract, lolTokenContract, rwrTokenContract, address, fetchVaultData]);

  const handleDeposit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultContract || !lolTokenContract || !vaultData) return;

    try {
      setError(null);
      const amountWei = ethers.utils.parseEther(vaultData.depositAmount);

      const approveTx = await lolTokenContract.approve(vaultContract.address, amountWei);
      await approveTx.wait();

      const depositTx = await vaultContract.deposit(amountWei, address);
      await depositTx.wait();

      toast.success("Deposit successful!");
      setVaultData(prevData => {
        if (!prevData) return null;
        return {
          ...prevData,
          depositAmount: '',
          balance: ethers.utils.formatEther(ethers.utils.parseEther(prevData.balance).add(amountWei)),
          lolBalance: ethers.utils.formatEther(ethers.utils.parseEther(prevData.lolBalance).sub(amountWei))
        };
      });
      fetchVaultData();
    } catch (err) {
      console.error("Error during deposit:", err);
      setError("Failed to deposit: " + (err as Error).message);
      toast.error("Failed to deposit. Please try again.");
    }
  }, [vaultContract, lolTokenContract, vaultData, address, fetchVaultData]);

  const handleWithdraw = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultContract || !vaultData) return;

    try {
      setError(null);
      const amountWei = ethers.utils.parseEther(vaultData.withdrawAmount);

      const withdrawTx = await vaultContract.withdraw(amountWei, address, address);
      await withdrawTx.wait();

      toast.success("Withdrawal successful!");
      setVaultData(prevData => {
        if (!prevData) return null;
        return {
          ...prevData,
          withdrawAmount: '',
          balance: ethers.utils.formatEther(ethers.utils.parseEther(prevData.balance).sub(amountWei)),
          lolBalance: ethers.utils.formatEther(ethers.utils.parseEther(prevData.lolBalance).add(amountWei))
        };
      });
      fetchVaultData();
    } catch (err) {
      console.error("Error during withdrawal:", err);
      setError("Failed to withdraw: " + (err as Error).message);
      toast.error("Failed to withdraw. Please try again.");
    }
  }, [vaultContract, vaultData, address, fetchVaultData]);

  const handleClaimYield = useCallback(async () => {
    if (!vaultContract) return;

    try {
      setError(null);
      const claimTx = await vaultContract.claimYield();
      await claimTx.wait();

      toast.success("RWR yield claimed successfully!");
      fetchVaultData();
    } catch (err) {
      console.error("Error claiming RWR yield:", err);
      setError("Failed to claim RWR yield: " + (err as Error).message);
      toast.error("Failed to claim RWR yield. Please try again.");
    }
  }, [vaultContract, fetchVaultData]);

  const handleWithdrawAll = useCallback(async () => {
    if (!vaultContract || !vaultData) return;

    try {
      setVaultData(prevData => {
        if (!prevData) return null;
        return {
          ...prevData,
          withdrawAmount: prevData.balance
        };
      });
    } catch (err) {
      console.error("Error setting maximum withdrawal amount:", err);
      setError("Failed to set maximum withdrawal amount: " + (err as Error).message);
      toast.error("Failed to set maximum withdrawal amount. Please try again.");
    }
  }, [vaultContract, vaultData]);

  const calculateRealTimeAmount = useCallback((amount: string, isDeposit: boolean) => {
    if (!amount || !vaultData) return '0';
    const amountFloat = parseFloat(amount);
    const yieldRateFloat = parseFloat(vaultData.yieldRate) / 100;
    const dailyYield = isDeposit ? amountFloat * yieldRateFloat : 0;
    return (amountFloat + dailyYield).toFixed(4);
  }, [vaultData]);

  const calculateRealTimeEarnings = useCallback(() => {
    if (!vaultData) return '0';
    const balance = parseFloat(vaultData.balance);
    const yieldRate = parseFloat(vaultData.yieldRate) / 100;
    const timePassed = (Date.now() - vaultData.lastUpdate) / (1000 * 60 * 60 * 24); // in days
    return (balance * yieldRate * timePassed).toFixed(4);
  }, [vaultData]);

  const calculateCompoundInterest = useCallback(() => {
    if (!vaultData) return '0';
    const principal = parseFloat(vaultData.balance);
    const rate = parseFloat(vaultData.yieldRate) / 36500; // Convert daily rate to daily decimal
    const periods = compoundPeriod;

    return (principal * Math.pow(1 + rate, periods)).toFixed(4);
  }, [vaultData, compoundPeriod]);

  const generateCompoundInterestData = useCallback(() => {
    if (!vaultData) return [];
    const principal = parseFloat(vaultData.balance);
    const rate = parseFloat(vaultData.yieldRate) / 36500; // Convert daily rate to daily decimal
    const data = [];

    for (let day = 0; day <= compoundPeriod; day++) {
      data.push({
        day,
        balance: (principal * Math.pow(1 + rate, day)).toFixed(4)
      });
    }

    return data;
  }, [vaultData, compoundPeriod]);

  const InputField: React.FC<{
    icon: React.ReactNode;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    [key: string]: any;
  }> = ({ icon, placeholder, value, onChange, type = "text", ...props }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="relative flex items-center"
    >
      <div className="absolute left-3 text-purple-400">
        {icon}
      </div>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-white bg-opacity-20 p-2 pl-10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        {...props}
      />
    </motion.div>
  );

  const GlowingButton: React.FC<{
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }> = ({ children, onClick, className = "" }) => (
    <motion.button
      whileHover={{ scale: 1.05, boxShadow: "0 0 15px rgba(167, 139, 250, 0.5)" }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold py-2 px-4 rounded-full transition-all duration-300 ${className}`}
    >
      {children}
    </motion.button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 text-white p-8 font-sans">
      <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} newestOnTop closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="dark" />
      
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="absolute top-4 left-4 z-10"
      >
        <GlowingButton onClick={() => router.back()}>
          <ChevronLeft className="mr-2" /> Back
        </GlowingButton>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="container mx-auto mt-16"
      >
        <h2 className="text-6xl font-bold mb-8 text-center bg-gradient-to-r from-purple-400 to-pink-600 text-transparent bg-clip-text">Meme Vault</h2>

        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div
            className="p-6 bg-white bg-opacity-10 rounded-xl text-center backdrop-blur-md"
            whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(167, 139, 250, 0.3)" }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="text-2xl font-semibold mb-2 flex items-center justify-center">
              <DollarSign className="mr-2 text-purple-400" /> Total Assets
            </h3>
            <p className="text-4xl font-bold bg-gradient-to-r from-green-400 to-blue-500 text-transparent bg-clip-text">
              {vaultData ? parseFloat(vaultData.totalAssets).toFixed(4) : '0'} {vaultData?.lolSymbol}
            </p>
          </motion.div>

          <motion.div
            className="p-6 bg-white bg-opacity-10 rounded-xl text-center backdrop-blur-md"
            whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(167, 139, 250, 0.3)" }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="text-2xl font-semibold mb-2 flex items-center justify-center">
              <TrendingUp className="mr-2 text-purple-400" /> Yield Rate
            </h3>
            <p className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 text-transparent bg-clip-text">
              {vaultData ? vaultData.yieldRate : '0'}% daily
            </p>
          </motion.div>

          <div className="flex justify-end items-center">
            {!address ? (
              <GlowingButton onClick={connect} className="w-full md:w-auto">Connect Wallet</GlowingButton>
            ) : (
              <div className="flex space-x-4">
                <select 
                  onChange={(e) => switchNetwork(Number(e.target.value))} 
                  value={chainId || ''}
                  className="bg-white bg-opacity-20 text-white p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-300"
                >
                  {SUPPORTED_CHAIN_IDS.map((id) => (
                    <option key={id} value={id}>{chainConfig[id].chainName}</option>
                  ))}
                </select>
                <GlowingButton onClick={disconnect}>Disconnect</GlowingButton>
              </div>
            )}
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500 bg-opacity-20 border border-red-500 text-white px-4 py-3 rounded-lg relative mb-4"
            role="alert"
          >
            <strong className="font-bold">Error!</strong>
            <span className="block sm:inline"> {error}</span>
          </motion.div>
        )}

        {isLoading ? (
          <div className="text-center">
            <Loader className="animate-spin h-16 w-16 mx-auto mb-4 text-purple-500" />
            <p className="text-xl">Loading vault data...</p>
          </div>
        ) : vaultData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <motion.div
              whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(167, 139, 250, 0.3)" }}
              className="bg-white bg-opacity-10 p-6 rounded-xl shadow-lg backdrop-blur-md"
            >
              <h3 className="text-2xl font-semibold mb-4 flex items-center">
                <BarChart2 className="mr-2 text-purple-400" /> Vault Statistics
                <Info
                  className="ml-2 cursor-pointer text-purple-400 hover:text-purple-300"
                  onClick={() => setShowInfo(!showInfo)}
                />
              </h3>
              <AnimatePresence>
                {showInfo && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-purple-900 bg-opacity-50 p-4 rounded-lg mb-4"
                  >
                    <p>This vault allows you to deposit {vaultData.lolSymbol} tokens and earn yield in RWR tokens. The yield rate is variable and can change over time. Your earnings are not automatically compounded but can be claimed as RWR tokens.</p>
                  </motion.div>
                )}
              </AnimatePresence>
              <div className="space-y-2">
                <p className="flex justify-between">
                  <span>Your Vault Balance:</span>
                  <span className="font-bold">{parseFloat(vaultData.balance).toFixed(4)} m{vaultData.lolSymbol}</span>
                </p>
                <p className="flex justify-between">
                  <span>Your {vaultData.lolSymbol} Balance:</span>
                  <span className="font-bold">{parseFloat(vaultData.lolBalance).toFixed(4)} {vaultData.lolSymbol}</span>
                </p>
                <p className="flex justify-between">
                  <span>Your RWR Balance:</span>
                  <span className="font-bold">{parseFloat(vaultData.rwrBalance).toFixed(4)} RWR</span>
                </p>
                <p className="flex justify-between items-center">
                  <span className="flex items-center">
                    <TrendingUp className="mr-2 text-purple-400" /> Your Yield Booster:
                  </span>
                  <span className="font-bold text-green-400">{vaultData.yieldBooster}%</span>
                </p>
                <p className="flex justify-between items-center">
                  <span className="flex items-center">
                    <DollarSign className="mr-2 text-purple-400" /> Claimable Yield:
                  </span>
                  <span className="font-bold text-yellow-400">{calculateRealTimeEarnings()} RWR</span>
                </p>
                <p className="flex justify-between">
                  <span>Max Deposit Limit:</span>
                  <span className="font-bold">{vaultData.maxDepositLimit} {vaultData.lolSymbol}</span>
                </p>
                <p className="flex justify-between">
                  <span>Max Withdraw Limit:</span>
                  <span className="font-bold">{vaultData.maxWithdrawLimit} {vaultData.lolSymbol}</span>
                </p>
              </div>
              <div className="flex justify-between items-center mt-6">
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
              whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(167, 139, 250, 0.3)" }}
              className="bg-white bg-opacity-10 p-6 rounded-xl shadow-lg backdrop-blur-md"
            >
              <h3 className="text-2xl font-semibold mb-4 flex items-center">
                <ArrowUpCircle className="mr-2 text-purple-400" /> Deposit {vaultData.lolSymbol}
              </h3>
              <form onSubmit={handleDeposit} className="space-y-4">
                <InputField
                  icon={<DollarSign className="text-purple-400" />}
                  type="text"
                  placeholder={`Amount to deposit (${vaultData.lolSymbol})`}
                  value={vaultData.depositAmount}
                  onChange={(value) => setVaultData(prev => prev ? { ...prev, depositAmount: value } : null)}
                />
                <p className="text-sm">You will receive: {calculateRealTimeAmount(vaultData.depositAmount, true)} m{vaultData.lolSymbol}</p>
                <GlowingButton className="w-full">Deposit</GlowingButton>
              </form>

              <h3 className="text-2xl font-semibold my-6 flex items-center">
                <ArrowDownCircle className="mr-2 text-purple-400" /> Withdraw {vaultData.lolSymbol}
              </h3>
              <form onSubmit={handleWithdraw} className="space-y-4">
                <div className="relative">
                  <InputField
                    icon={<DollarSign className="text-purple-400" />}
                    type="text"
                    placeholder={`Amount to withdraw (${vaultData.lolSymbol})`}
                    value={vaultData.withdrawAmount}
                    onChange={(value) => setVaultData(prev => prev ? { ...prev, withdrawAmount: value } : null)}
                  />
                  <button
                    type="button"
                    onClick={handleWithdrawAll}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-purple-500 text-white px-2 py-1 rounded text-xs"
                  >
                    Max
                  </button>
                </div>
                <p className="text-sm">You will receive: {calculateRealTimeAmount(vaultData.withdrawAmount, false)} {vaultData.lolSymbol}</p>
                <GlowingButton className="w-full">Withdraw</GlowingButton>
              </form>
            </motion.div>
          </div>
        ) : (
          <div className="text-center text-2xl">No vault data available</div>
        )}

        {vaultData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
            <motion.div
              whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(167, 139, 250, 0.3)" }}
              className="bg-white bg-opacity-10 p-6 rounded-xl shadow-lg backdrop-blur-md"
            >
              <h3 className="text-2xl font-semibold mb-4">Earnings Projection</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={earningsHistory}>
                  <defs>
                    <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="#fff" />
                  <YAxis stroke="#fff" />
                  <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', border: 'none' }} />
                  <Area type="monotone" dataKey="totalBalance" stroke="#8884d8" fillOpacity={1} fill="url(#colorUv)" />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(167, 139, 250, 0.3)" }}
              className="bg-white bg-opacity-10 p-6 rounded-xl shadow-lg backdrop-blur-md"
            >
              <h3 className="text-2xl font-semibold mb-4">Compound Interest Calculator</h3>
              <div className="flex items-center mb-4">
                <InputField
                  icon={<BarChart2 className="text-purple-400" />}
                  type="number"
                  placeholder=''
                  value={compoundPeriod.toString()}
                  onChange={(value) => setCompoundPeriod(parseInt(value))}
                  className="w-1/2 mr-2"
                />
                <span>days</span>
              </div>
              <p className="text-lg mb-4">
                Estimated balance after {compoundPeriod} days:
                {' '}
                <span className="font-bold text-green-400">{calculateCompoundInterest()} {vaultData.lolSymbol}</span>
              </p>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={generateCompoundInterestData()}>
                  <defs>
                    <linearGradient id="colorCompound" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke="#fff" />
                  <YAxis stroke="#fff" />
                  <RechartsTooltip contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', border: 'none' }} />
                  <Area type="monotone" dataKey="balance" stroke="#82ca9d" fillOpacity={1} fill="url(#colorCompound)" />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          </div>
        )}

        <motion.div
          whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(167, 139, 250, 0.3)" }}
          className="mt-8 p-6 bg-white bg-opacity-10 rounded-xl shadow-lg backdrop-blur-md"
        >
          <h3 className="text-2xl font-semibold mb-4 text-center">Vault Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-purple-800 bg-opacity-50 p-4 rounded-lg text-center"
            >
              <h4 className="text-lg font-semibold mb-2">Total Deposits</h4>
              <p className="text-2xl font-bold">{parseFloat(vaultData?.totalAssets || '0').toFixed(2)} {vaultData?.lolSymbol}</p>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-purple-800 bg-opacity-50 p-4 rounded-lg text-center"
            >
              <h4 className="text-lg font-semibold mb-2">Your Earnings</h4>
              <p className="text-2xl font-bold text-green-400">{calculateRealTimeEarnings()} RWR</p>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="bg-purple-800 bg-opacity-50 p-4 rounded-lg text-center"
            >
              <h4 className="text-lg font-semibold mb-2">APY</h4>
              <p className="text-2xl font-bold text-yellow-400">{(parseFloat(vaultData?.yieldRate || '0') * 365).toFixed(2)}%</p>
            </motion.div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02, boxShadow: "0 0 20px rgba(167, 139, 250, 0.3)" }}
          className="mt-8 p-6 bg-white bg-opacity-10 rounded-xl shadow-lg backdrop-blur-md text-center"
        >
          <h3 className="text-2xl font-semibold mb-4">Vault Strategy</h3>
          <p className="text-lg">
            Our vault employs a cutting-edge yield farming strategy, leveraging the power of {vaultData?.lolSymbol} tokens 
            to generate consistent returns. By depositing your {vaultData?.lolSymbol} tokens, you&apos;re not just holding – 
            you&apos;re actively participating in the future of decentralized finance.
          </p>
        </motion.div>

        {/* <div className="mt-8 flex justify-center space-x-4">
          <Link href="/faq">
            <GlowingButton>
              FAQ
            </GlowingButton>
          </Link>
          <Link href="/support">
            <GlowingButton>
              Get Support
            </GlowingButton>
          </Link>
        </div> */}
      </motion.div>

      {/* Floating Action Button for Quick Deposit */}
      <motion.div
        className="fixed bottom-8 right-8"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <GlowingButton
          onClick={() => document.getElementById('depositInput')?.focus()}
          className="w-16 h-16 rounded-full flex items-center justify-center"
        >
          <Lock size={24} />
        </GlowingButton>
      </motion.div>

      <ReactTooltip id="global-tooltip" />
    </div>
  );
};

export default VaultPage;
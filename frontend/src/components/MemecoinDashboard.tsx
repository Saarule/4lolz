import React, { useState, useEffect, useCallback } from 'react';
import { useBlockchain } from '../hooks/useBlockchain';
import { ethers } from 'ethers';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, CartesianGrid, AreaChart, Area } from 'recharts';
import { Loader, ArrowUpRight, ArrowDownRight, DollarSign, Users, Zap, TrendingUp, Search } from 'lucide-react';
import Link from 'next/link';

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F67280', '#C06C84'];

const CustomXAxis = ({ tick, ...props }) => <XAxis tick={{ ...tick, fill: '#ffffff' }} {...props} />;
const CustomYAxis = ({ tick, ...props }) => <YAxis tick={{ ...tick, fill: '#ffffff' }} {...props} />;

// Placeholder for price API function (replace with actual API call)
const fetchTokenPrice = async (tokenAddress) => {
  // In reality, you would make an API call here
  return Math.random() * 10; // Random price between 0 and 10 for demonstration
};

const MemecoinDashboard = () => {
  const { contract } = useBlockchain();
  const [memecoins, setMemecoins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalMarketCap, setTotalMarketCap] = useState(0);
  const [totalHolders, setTotalHolders] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchMemecoins = useCallback(async () => {
    if (!contract) return;

    try {
      const tokenCount = await contract.tokenCount();
      const memecoinsData = [];
      let marketCapSum = 0;
      let holdersSum = 0;

      for (let i = 1; i <= tokenCount; i++) {
        const tokenAddress = await contract.memeTokens(i);
        const tokenContract = new ethers.Contract(tokenAddress, [
          'function name() view returns (string)',
          'function symbol() view returns (string)',
          'function totalSupply() view returns (uint256)',
          'function memeUri() view returns (string)',
          'function description() view returns (string)',
          'function balanceOf(address) view returns (uint256)'
        ], contract.provider);

        const [name, symbol, totalSupply, memeUri, description] = await Promise.all([
          tokenContract.name(),
          tokenContract.symbol(),
          tokenContract.totalSupply(),
          tokenContract.memeUri(),
          tokenContract.description()
        ]);

        const creatorBalance = await tokenContract.balanceOf(await contract.signer.getAddress());
        const circulatingSupply = totalSupply.sub(creatorBalance);
        
        const price = await fetchTokenPrice(tokenAddress);
        const marketCap = parseFloat(ethers.utils.formatEther(totalSupply)) * price;
        
        const holders = await contract.provider.getTransactionCount(tokenAddress);
        const volume24h = marketCap * 0.1; // Assuming 10% daily volume, replace with real data

        marketCapSum += marketCap;
        holdersSum += holders;

        memecoinsData.push({
          id: i,
          name,
          symbol,
          totalSupply: ethers.utils.formatEther(totalSupply),
          memeUri,
          description,
          creatorBalance: ethers.utils.formatEther(creatorBalance),
          circulatingSupply: ethers.utils.formatEther(circulatingSupply),
          price,
          marketCap,
          holders,
          volume24h
        });
      }

      setTotalMarketCap(marketCapSum);
      setTotalHolders(holdersSum);

      return memecoinsData;
    } catch (err) {
      console.error('Error in fetchMemecoins:', err);
      throw new Error('Failed to fetch memecoins data');
    }
  }, [contract]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!contract) return;

      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchMemecoins();
        if (isMounted) {
          setMemecoins(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [fetchMemecoins, contract]);

  const filteredMemecoins = memecoins.filter(coin =>
    coin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coin.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900">
        <Loader className="w-12 h-12 animate-spin text-purple-500" />
        <p className="ml-4 text-white text-xl">Loading memecoins data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900">
        <div className="text-red-500 text-center p-8 bg-white bg-opacity-10 rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (memecoins.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900">
        <div className="text-white text-center p-8 bg-white bg-opacity-10 rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold mb-4">No Memecoins Found</h2>
          <p>Create some memecoins to see the dashboard!</p>
        </div>
      </div>
    );
  }

  const marketCapData = memecoins.map(coin => ({
    name: coin.symbol,
    value: coin.marketCap
  }));

  const volumeData = memecoins.map(coin => ({
    name: coin.symbol,
    volume: coin.volume24h
  }));

  const supplyComparison = memecoins.map(coin => ({
    name: coin.symbol,
    totalSupply: parseFloat(coin.totalSupply),
    circulatingSupply: parseFloat(coin.circulatingSupply)
  }));

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h2 className="text-4xl font-bold mb-8 text-center">Memecoin Analytics Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-purple-600 to-indigo-600 p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-200">
          <h3 className="text-lg font-semibold mb-2">Total Market Cap</h3>
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 mr-2" />
            <span className="text-2xl font-bold">${totalMarketCap.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
        </div>
        <div className="bg-gradient-to-br from-pink-600 to-red-600 p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-200">
          <h3 className="text-lg font-semibold mb-2">Total Holders</h3>
          <div className="flex items-center">
            <Users className="w-8 h-8 mr-2" />
            <span className="text-2xl font-bold">{totalHolders.toLocaleString()}</span>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-600 to-teal-600 p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-200">
          <h3 className="text-lg font-semibold mb-2">Total Memecoins</h3>
          <div className="flex items-center">
            <Zap className="w-8 h-8 mr-2" />
            <span className="text-2xl font-bold">{memecoins.length}</span>
          </div>
        </div>
        <div className="bg-gradient-to-br from-yellow-600 to-orange-600 p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-200">
          <h3 className="text-lg font-semibold mb-2">Avg. Market Cap</h3>
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 mr-2" />
            <span className="text-2xl font-bold">${(totalMarketCap / memecoins.length).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-white bg-opacity-10 p-6 rounded-xl shadow-lg">
          <h3 className="text-xl font-semibold mb-4">Market Cap Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={marketCapData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {marketCapData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white bg-opacity-10 p-6 rounded-xl shadow-lg">
          <h3 className="text-xl font-semibold mb-4">24h Trading Volume</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={volumeData}>
              <CustomXAxis dataKey="name" />
              <CustomYAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="volume" fill="#8884d8" name="24h Volume" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white bg-opacity-10 p-6 rounded-xl shadow-lg mb-8">
        <h3 className="text-xl font-semibold mb-4">Supply Comparison</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={supplyComparison}>
            <CustomXAxis dataKey="name" />
            <CustomYAxis />
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff33" />
            <Tooltip />
            <Legend />
            <Area type="monotone" dataKey="totalSupply" stackId="1" stroke="#8884d8" fill="#8884d8" name="Total Supply" />
            <Area type="monotone" dataKey="circulatingSupply" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="Circulating Supply" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white bg-opacity-10 p-6 rounded-xl shadow-lg">
        <h3 className="text-xl font-semibold mb-4">Memecoin List</h3>
        <div className="mb-4 relative">
          <input
            type="text"
            placeholder="Search memecoins..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg py-2 px-4 pl-10 focus:outline-none focus:border-blue-500"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400" />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white bg-opacity-5 rounded-lg overflow-hidden">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Symbol</th>
                <th className="px-4 py-2 text-right">Price</th>
                <th className="px-4 py-2 text-right">Market Cap</th>
                <th className="px-4 py-2 text-right">24h Volume</th>
                <th className="px-4 py-2 text-right">Holders</th>
                <th className="px-4 py-2 text-center">Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredMemecoins.map(coin => (
                <tr key={coin.id} className="border-b border-gray-700 hover:bg-gray-800 transition-colors duration-200">
                  <td className="px-4 py-2">{coin.name}</td>
                  <td className="px-4 py-2">{coin.symbol}</td>
                  <td className="px-4 py-2 text-right">${coin.price.toFixed(4)}</td>
                  <td className="px-4 py-2 text-right">${coin.marketCap.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td className="px-4 py-2 text-right">${coin.volume24h.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td className="px-4 py-2 text-right">{coin.holders.toLocaleString()}</td>
                  <td className="px-4 py-2 text-center"><Link href={`/token/${coin.id}`} className="text-blue-400 hover:text-blue-300 underline">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default React.memo(MemecoinDashboard);
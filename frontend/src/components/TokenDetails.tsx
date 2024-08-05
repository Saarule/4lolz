import { useRouter } from 'next/router';
import { useBlockchain } from '../hooks/useBlockchain';
import { ethers } from 'ethers';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { Loader, DollarSign, Users, Zap, TrendingUp, ArrowUpRight, ArrowDownRight, Link as LinkIcon } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const COLORS = ['#FF6B6B', '#4ECDC4'];

const CustomXAxis = ({ tick, ...props }) => <XAxis tick={{ ...tick, fill: '#ffffff' }} {...props} />;
const CustomYAxis = ({ tick, ...props }) => <YAxis tick={{ ...tick, fill: '#ffffff' }} {...props} />;

// Placeholder for price API functions (replace with actual API calls)
const fetchTokenPrice = async (tokenAddress) => {
  return Math.random() * 10; // Random price between 0 and 10 for demonstration
};

const fetchPriceHistory = async (tokenAddress) => {
  const basePrice = Math.random() * 10;
  return Array.from({length: 30}, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - 29 + i);
    return {
      date: date.toISOString().split('T')[0],
      price: basePrice * (1 + (Math.random() * 0.4 - 0.2)) // Random price within 20% of base price
    };
  });
};

const TokenDetails = () => {
  const router = useRouter();
  const { id } = router.query;
  const { contract } = useBlockchain();
  const [tokenData, setTokenData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTokenData = async () => {
      if (!contract || !id) return;

      try {
        setIsLoading(true);
        const tokenAddress = await contract.memeTokens(id);
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
        
        const historicalData = await fetchPriceHistory(tokenAddress);
        
        const priceChange24h = ((price - historicalData[0].price) / historicalData[0].price) * 100;

        setTokenData({
          id,
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
          volume24h,
          priceChange24h,
          historicalData
        });
      } catch (err) {
        console.error('Error fetching token data:', err);
        setError('Failed to fetch token data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTokenData();
  }, [contract, id]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900">
        <Loader className="w-12 h-12 animate-spin text-purple-500" />
        <p className="ml-4 text-white text-xl">Loading token data...</p>
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

  if (!tokenData) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-900">
        <div className="text-white text-center p-8 bg-white bg-opacity-10 rounded-xl shadow-lg">
          <h2 className="text-2xl font-bold mb-4">No Data Found</h2>
          <p>No data found for this token.</p>
        </div>
      </div>
    );
  }

  const supplyData = [
    { name: 'Circulating Supply', value: parseFloat(tokenData.circulatingSupply) },
    { name: 'Creator Balance', value: parseFloat(tokenData.creatorBalance) }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <Link href="/" className="text-blue-400 hover:text-blue-300 mb-4 inline-block">
        &larr; Back to Dashboard
      </Link>
      <h2 className="text-4xl font-bold mb-8">{tokenData.name} ({tokenData.symbol}) Details</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-purple-600 to-indigo-600 p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-200">
          <h3 className="text-lg font-semibold mb-2">Price</h3>
          <div className="flex items-center">
            <DollarSign className="w-8 h-8 mr-2" />
            <span className="text-2xl font-bold">${tokenData.price.toFixed(4)}</span>
          </div>
          <div className={`flex items-center mt-2 ${tokenData.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {tokenData.priceChange24h >= 0 ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
            <span>{Math.abs(tokenData.priceChange24h).toFixed(2)}%</span>
          </div>
        </div>
        <div className="bg-gradient-to-br from-pink-600 to-red-600 p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-200">
          <h3 className="text-lg font-semibold mb-2">Market Cap</h3>
          <div className="flex items-center">
            <TrendingUp className="w-8 h-8 mr-2" />
            <span className="text-2xl font-bold">${tokenData.marketCap.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-600 to-teal-600 p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-200">
          <h3 className="text-lg font-semibold mb-2">24h Volume</h3>
          <div className="flex items-center">
            <Zap className="w-8 h-8 mr-2" />
            <span className="text-2xl font-bold">${tokenData.volume24h.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
        </div>
        <div className="bg-gradient-to-br from-yellow-600 to-orange-600 p-6 rounded-xl shadow-lg transform hover:scale-105 transition-transform duration-200">
          <h3 className="text-lg font-semibold mb-2">Holders</h3>
          <div className="flex items-center">
            <Users className="w-8 h-8 mr-2" />
            <span className="text-2xl font-bold">{tokenData.holders.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-white bg-opacity-10 p-6 rounded-xl shadow-lg">
          <h3 className="text-xl font-semibold mb-4">Supply Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={supplyData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {supplyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white bg-opacity-10 p-6 rounded-xl shadow-lg">
          <h3 className="text-xl font-semibold mb-4">Price History</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={tokenData.historicalData}>
              <CustomXAxis dataKey="date" />
              <CustomYAxis />
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff33" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="price" stroke="#8884d8" name="Price" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white bg-opacity-10 p-6 rounded-xl shadow-lg mb-8">
        <h3 className="text-xl font-semibold mb-4">Token Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p><strong>Name:</strong> {tokenData.name}</p>
            <p><strong>Symbol:</strong> {tokenData.symbol}</p>
            <p><strong>Total Supply:</strong> {parseFloat(tokenData.totalSupply).toLocaleString()}</p>
            <p><strong>Circulating Supply:</strong> {parseFloat(tokenData.circulatingSupply).toLocaleString()}</p>
          </div>
          <div>
            <p><strong>Creator Balance:</strong> {parseFloat(tokenData.creatorBalance).toLocaleString()}</p>
            <p><strong>Contract Address:</strong> {tokenData.id}</p>
            <p>
              <strong>Meme URI:</strong>{' '}
              <a href={tokenData.memeUri} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 flex items-center">
                View Meme <LinkIcon className="ml-1 w-4 h-4" />
              </a>
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white bg-opacity-10 p-6 rounded-xl shadow-lg">
        <h3 className="text-xl font-semibold mb-4">Description</h3>
        <p className="text-gray-300">{tokenData.description}</p>
      </div>
    </div>
  );
};

export default TokenDetails;
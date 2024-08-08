import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader } from 'lucide-react';

const GoldskyAnalytics = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGoldskyData = async () => {
      setIsLoading(true);
      try {
        // Replace this URL with your actual Goldsky API endpoint
        const response = await fetch('https://api.goldsky.com/api/public/project_clsomeproject/subgraphs/meme-finance/1.0.0/gql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `
              {
                memecoins(first: 10, orderBy: totalSupply, orderDirection: desc) {
                  id
                  name
                  symbol
                  totalSupply
                  createdAt
                  dailyVolumes(first: 30, orderBy: timestamp, orderDirection: desc) {
                    volume
                    timestamp
                  }
                }
              }
            `
          }),
        });

        const result = await response.json();
        setAnalyticsData(result.data.memecoins);
      } catch (err) {
        console.error("Error fetching Goldsky data:", err);
        setError("Failed to fetch analytics data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchGoldskyData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader className="animate-spin h-10 w-10 text-purple-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-center p-4">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white bg-opacity-10 p-6 rounded-xl shadow-lg"
    >
      {analyticsData && analyticsData.length > 0 ? (
        <>
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-2">Top Memecoins by Total Supply</h3>
            <ul>
              {analyticsData.map((coin) => (
                <li key={coin.id} className="mb-2">
                  {coin.name} ({coin.symbol}): {parseFloat(coin.totalSupply).toLocaleString()} tokens
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Volume Trends (Last 30 Days)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData[0].dailyVolumes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(unixTime) => new Date(unixTime * 1000).toLocaleDateString()}
                  stroke="#888"
                />
                <YAxis stroke="#888" />
                <Tooltip 
                  labelFormatter={(unixTime) => new Date(unixTime * 1000).toLocaleDateString()}
                  formatter={(value) => parseFloat(value).toLocaleString()}
                />
                <Legend />
                <Line type="monotone" dataKey="volume" stroke="#8884d8" name="Daily Volume" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : (
        <p>No analytics data available</p>
      )}
    </motion.div>
  );
};

export default GoldskyAnalytics;
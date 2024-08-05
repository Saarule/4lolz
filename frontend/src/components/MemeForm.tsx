import React, { useState, useEffect } from 'react';
import { useBlockchain } from '../hooks/useBlockchain';
import { ethers } from 'ethers';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';

const MemeForm: React.FC = () => {
  const { createMemeToken, connect, address } = useBlockchain();
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [initialSupply, setInitialSupply] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('https://via.placeholder.com/300');
  // const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!address) {
      connect().catch((err) => setError(err.message));
    }
  }, [address, connect]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = (): string | null => {
    if (!name.trim()) return "Coin name is required";
    if (!symbol.trim()) return "Symbol is required";
    if (symbol.length > 5) return "Symbol should be 5 characters or less";
    if (!initialSupply.trim()) return "Initial supply is required";
    if (!/^\d*\.?\d*$/.test(initialSupply)) return "Initial supply must be a valid number";
    try {
      const supply = ethers.utils.parseUnits(initialSupply, 18);
      if (supply.lte(0)) return "Initial supply must be greater than zero";
    } catch {
      return "Invalid initial supply. Please enter a valid number";
    }
    if (!description.trim()) return "Description is required";
    if (description.length > 280) return "Description must be 280 characters or less";
    if (!imageUrl) return "Please upload an image for your memecoin";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSuccess(false);
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
  
    setIsLoading(true);
    try {
      console.log("Submitting form with data:", {
        name,
        symbol,
        initialSupply,
        imageUrl,
        description,
      });
      
      await createMemeToken(
        name.trim(),
        symbol.trim(),
        initialSupply.trim(),
        imageUrl,
        description.trim()
      );
      
      setIsSuccess(true);
      setName('');
      setSymbol('');
      setInitialSupply('');
      setDescription('');
      setImageUrl('');
    } catch (err: any) {
      console.error("Error in handleSubmit:", err);
      setError(err.message || 'Failed to create Meme Token');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">Coin Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-white bg-opacity-20 p-2 rounded-lg text-white placeholder-gray-400"
            placeholder="e.g., Doge Coin"
          />
        </div>
        <div>
          <label htmlFor="symbol" className="block text-sm font-medium text-gray-300 mb-1">Symbol</label>
          <input
            id="symbol"
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="w-full bg-white bg-opacity-20 p-2 rounded-lg text-white placeholder-gray-400"
            placeholder="e.g., DOGE"
          />
        </div>
      </div>
      <div>
        <label htmlFor="initialSupply" className="block text-sm font-medium text-gray-300 mb-1">Initial Supply</label>
        <input
          id="initialSupply"
          type="text"
          value={initialSupply}
          onChange={(e) => {
            const value = e.target.value;
            if (value === '' || /^\d*\.?\d*$/.test(value)) {
              setInitialSupply(value);
            }
          }}
          className="w-full bg-white bg-opacity-20 p-2 rounded-lg text-white placeholder-gray-400"
          placeholder="e.g., 1000000"
        />
      </div>
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">Description</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={280}
          className="w-full bg-white bg-opacity-20 p-2 rounded-lg text-white placeholder-gray-400 h-24 resize-none"
          placeholder="Describe your memecoin (max 280 characters)"
        />
        <p className="text-xs text-gray-400 mt-1">{description.length}/280 characters</p>
      </div>
      <div>
        <label htmlFor="image-upload" className="block text-sm font-medium text-gray-300 mb-1">Upload Image</label>
        <div className="flex items-center justify-center w-full h-32 border-2 border-white border-dashed rounded-lg cursor-pointer hover:border-gray-300">
          {imageUrl ? (
            <img src={imageUrl} alt="Memecoin" className="h-full object-contain" />
          ) : (
            <label htmlFor="image-upload" className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-8 h-8 mb-2 text-white" />
              <p className="text-xs text-white">Click to upload</p>
            </label>
          )}
          <input id="image-upload" type="file" className="hidden" onChange={handleImageUpload} accept="image/*" />
        </div>
      </div>
      {error && (
        <div className="bg-red-500 bg-opacity-20 border border-red-500 text-white px-4 py-3 rounded relative" role="alert">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span className="block sm:inline">{error}</span>
          </div>
        </div>
      )}
      {isSuccess && (
        <div className="bg-green-500 bg-opacity-20 border border-green-500 text-white px-4 py-3 rounded relative" role="alert">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            <span className="block sm:inline">Meme Token created successfully!</span>
          </div>
        </div>
      )}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Creating Memecoin...' : 'Create Memecoin'}
      </button>
    </form>
    
  );
};

export default MemeForm;
import React from 'react';
import { Loader } from 'lucide-react';

interface LoadingButtonProps {
  isLoading: boolean;
  text: string;
}

const LoadingButton: React.FC<LoadingButtonProps> = ({ isLoading, text }) => {
  return (
    <button
      type="submit"
      disabled={isLoading}
      className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isLoading ? (
        <Loader className="w-5 h-5 animate-spin mx-auto" />
      ) : (
        text
      )}
    </button>
  );
};

export default LoadingButton;

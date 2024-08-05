import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorDisplayProps {
  error: string | null;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error }) => {
  if (!error) return null;

  return (
    <div className="bg-red-500 bg-opacity-20 border border-red-500 text-white px-4 py-3 rounded relative" role="alert">
      <div className="flex items-center">
        <AlertCircle className="w-5 h-5 mr-2" />
        <span className="block sm:inline">{error}</span>
      </div>
    </div>
  );
};

export default ErrorDisplay;

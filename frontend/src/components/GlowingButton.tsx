import React from 'react';

const GlowingButton = ({ children, onClick, className = '' }) => {
  return (
    <button
      onClick={onClick}
      className={`relative px-6 py-3 font-bold text-white rounded-lg group ${className}`}
    >
      <span className="absolute inset-0 w-full h-full transition duration-300 transform -translate-x-1 -translate-y-1 bg-purple-800 ease opacity-80 group-hover:translate-x-0 group-hover:translate-y-0"></span>
      <span className="absolute inset-0 w-full h-full transition duration-300 transform translate-x-1 translate-y-1 bg-pink-800 ease opacity-80 group-hover:translate-x-0 group-hover:translate-y-0"></span>
      <span className="relative">{children}</span>
    </button>
  );
};

export default GlowingButton;
// File: src/components/Toast.jsx
// Location: src/components

import React, { useEffect, useState } from 'react';

const toastTypes = {
  success: {
    icon: '✅',
    bgColor: 'bg-green-600',
  },
  error: {
    icon: '❌',
    bgColor: 'bg-red-600',
  },
  info: {
    icon: '🔔',
    bgColor: 'bg-blue-600',
  },
};

export default function Toast({ message, type, onDismiss }) {
  const { icon, bgColor } = toastTypes[type] || toastTypes.info;
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setExiting(true);
      setTimeout(onDismiss, 500); // Wait for animation to finish
    }, 5000); // Auto-dismiss after 5 seconds

    return () => clearTimeout(timer);
  }, [onDismiss]);

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(onDismiss, 500);
  };

  return (
    <div
      className={`relative w-full max-w-sm p-4 rounded-lg shadow-lg text-white ${bgColor} overflow-hidden transform transition-all duration-500 ${exiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}`}
    >
      <div className="flex items-center">
        <span className="text-xl mr-3">{icon}</span>
        <p className="flex-grow text-sm font-medium">{message}</p>
        <button onClick={handleDismiss} className="ml-4 p-1 rounded-full hover:bg-white/20 focus:outline-none">
          &times;
        </button>
      </div>
    </div>
  );
}

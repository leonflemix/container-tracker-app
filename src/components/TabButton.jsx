// File: src/components/TabButton.jsx

import React from 'react';
export default function TabButton({ name, activeTab, setActiveTab, children }) {
    return (
        <button
            onClick={() => setActiveTab(name)}
            className={`px-3 py-2 text-sm font-medium rounded-md ${activeTab === name ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
        >
            {children}
        </button>
    );
}

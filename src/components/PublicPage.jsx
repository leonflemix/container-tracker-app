// File: src/components/PublicPage.jsx
import React from 'react';

// This is a standalone page, completely separate from the main dashboard layout.
export default function PublicPage() {
    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
            <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full text-center">
                <h1 className="text-3xl font-bold text-gray-800 mb-4">Public Access</h1>
                <p className="text-gray-600 mb-6">
                    This is a separate page accessed via a specific URL. 
                    It is independent of the main container management system.
                </p>
                
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 mb-6">
                    Ready for your custom content!
                </div>

                <a 
                    href="/" 
                    className="inline-block text-sm text-blue-500 hover:underline"
                >
                    &larr; Go to Main App
                </a>
            </div>
        </div>
    );
}
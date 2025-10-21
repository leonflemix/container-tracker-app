// File: src/components/ConfirmationModal.jsx

import React from 'react';
export default function ConfirmationModal({ message, onConfirm, onCancel }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-sm">
                <p className="text-lg text-white mb-4">{message}</p>
                <div className="flex justify-end gap-4">
                    <button onClick={onCancel} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-lg">Cancel</button>
                    <button onClick={onConfirm} className="py-2 px-4 bg-red-600 hover:bg-red-700 rounded-lg">Confirm Delete</button>
                </div>
            </div>
        </div>
    );
}

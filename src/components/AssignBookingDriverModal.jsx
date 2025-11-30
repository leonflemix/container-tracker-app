// File: src/components/AssignBookingDriverModal.jsx
// Location: src/components

import React from 'react';

export default function AssignBookingDriverModal({
    booking,
    drivers = [],
    selectedDriver,
    setSelectedDriver,
    onConfirm,
    onClose,
    isSaving
}) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h3 className="text-lg font-bold text-white">Assign Driver to Booking</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </header>
                
                <div className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Booking #</label>
                        <input 
                            type="text" 
                            value={booking?.id || ''} 
                            disabled 
                            className="w-full p-2 bg-gray-600 text-gray-300 rounded-md border border-gray-500"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Select Driver *</label>
                        <select 
                            value={selectedDriver} 
                            onChange={(e) => setSelectedDriver(e.target.value)} 
                            className="w-full p-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">-- Unassigned --</option>
                            {drivers.map(d => (
                                <option key={d.docId} value={d.name}>{d.name} {d.plate ? `- ${d.plate}` : ''}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-lg text-white"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={onConfirm} 
                            disabled={isSaving} 
                            className="py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-white disabled:bg-blue-800"
                        >
                            {isSaving ? 'Saving...' : 'Assign'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
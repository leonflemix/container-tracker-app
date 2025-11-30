// File: src/components/AssignBookingDriverModal.jsx
// Location: src/components

import React, { useState } from 'react';

export default function AssignBookingDriverModal({
    booking,
    drivers = [],
    containers = [], // New prop for associated containers
    selectedDriver,
    setSelectedDriver,
    onConfirm,
    onClose,
    isSaving
}) {
    const [isContainerListOpen, setIsContainerListOpen] = useState(false);

    // Group containers by status for display
    const groupedContainers = containers.reduce((acc, container) => {
        const status = container.status || 'Unknown';
        if (!acc[status]) acc[status] = [];
        acc[status].push(container);
        return acc;
    }, {});

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-sm max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-gray-700 shrink-0">
                    <h3 className="text-lg font-bold text-white">Assign Driver to Booking</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </header>
                
                <div className="p-4 space-y-4 overflow-y-auto">
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

                    {/* Container Status List Dropdown */}
                    <div className="border border-gray-600 rounded-md overflow-hidden">
                        <button 
                            type="button"
                            onClick={() => setIsContainerListOpen(!isContainerListOpen)}
                            className="w-full p-2 bg-gray-700 text-left text-sm text-gray-300 flex justify-between items-center hover:bg-gray-600 transition-colors"
                        >
                            <span className="font-semibold">Review Containers ({containers.length})</span>
                            <span className="text-xs">{isContainerListOpen ? '▲' : '▼'}</span>
                        </button>
                        
                        {isContainerListOpen && (
                            <div className="bg-gray-900 p-2 text-xs max-h-48 overflow-y-auto">
                                {Object.keys(groupedContainers).length > 0 ? (
                                    Object.entries(groupedContainers).map(([status, items]) => (
                                        <div key={status} className="mb-2 last:mb-0">
                                            <h4 className="font-bold text-gray-400 border-b border-gray-700 mb-1 pb-1 sticky top-0 bg-gray-900">
                                                {status} <span className="font-normal text-gray-500">({items.length})</span>
                                            </h4>
                                            <ul className="space-y-1">
                                                {items.map(c => (
                                                    <li key={c.id} className="text-gray-300 pl-2 flex justify-between">
                                                        <span>{c.id}</span>
                                                        {c.deliveryDriver && (
                                                            <span className="text-indigo-400" title="Already has driver">
                                                                🚚 {c.deliveryDriver}
                                                            </span>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-500 text-center py-2">No containers found for this booking.</p>
                                )}
                            </div>
                        )}
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
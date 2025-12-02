// File: src/components/CreateCollectionModal.jsx
import React, { useState } from 'react';

export default function CreateCollectionModal({ booking, drivers = [], onClose, onConfirm, isSaving }) {
    const [selectedDriver, setSelectedDriver] = useState('');
    const [date, setDate] = useState('');
    const [hour, setHour] = useState('08'); // Default to 8 AM

    const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!selectedDriver || !date) return;

        // Construct date object with 00 minutes
        const scheduledDate = new Date(`${date}T${hour}:00:00`);
        onConfirm({ driver: selectedDriver, scheduledDate });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h3 className="text-lg font-bold text-white">Schedule Collection</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </header>
                
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Booking #</label>
                        <input type="text" value={booking?.id} disabled className="w-full p-2 bg-gray-600 text-gray-300 rounded-md border border-gray-500" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Driver *</label>
                        <select 
                            value={selectedDriver} 
                            onChange={(e) => setSelectedDriver(e.target.value)} 
                            required
                            className="w-full p-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">-- Select Driver --</option>
                            {drivers.map(d => (
                                <option key={d.docId} value={d.name}>{d.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Date *</label>
                            <input 
                                type="date" 
                                value={date} 
                                onChange={(e) => setDate(e.target.value)} 
                                required
                                className="w-full p-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Time (Hour) *</label>
                            <select 
                                value={hour} 
                                onChange={(e) => setHour(e.target.value)} 
                                className="w-full p-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {hours.map(h => (
                                    <option key={h} value={h}>{h}:00</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-lg text-white">Cancel</button>
                        <button type="submit" disabled={isSaving} className="py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-white disabled:bg-blue-800">
                            {isSaving ? 'Saving...' : 'Schedule'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
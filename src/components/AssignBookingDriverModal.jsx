// File: src/components/AssignBookingDriverModal.jsx
// Location: src/components

import React, { useState } from 'react';
import { assignDriverToContainer } from '../services/containerService'; // Import individual assign service
import { useAppContext } from '../context/AppContext'; // Need context to get paths

export default function AssignBookingDriverModal({
    booking,
    drivers = [],
    containers = [], 
    selectedDriver,
    setSelectedDriver,
    onClose,
    isSaving
}) {
    const { paths, addToast } = useAppContext(); // Get context for paths/toast
    const { containersPath, eventsPath } = paths;

    const [isContainerListOpen, setIsContainerListOpen] = useState(true); // Default open to see containers
    const [assigningContainerId, setAssigningContainerId] = useState(null); // Track local loading state
    const [scheduledReturn, setScheduledReturn] = useState('');

    // --- FILTER LOGIC ---
    // Only allow assignment for specific statuses
    const ALLOWED_STATUSES = [
        'ALL GOOD, BOOK FOR DELIVERY',
        'NEED SQUISH',
        'CHASSIS NEEDS REPAIR'
    ];

    // Filter containers: 
    // 1. If a driver is selected, exclude containers already assigned to that driver
    // 2. Only show containers present in the ALLOWED_STATUSES list
    const displayedContainers = containers.filter(container => {
        const notAssignedToCurrent = !selectedDriver || container.deliveryDriver !== selectedDriver;
        const isAllowedStatus = ALLOWED_STATUSES.includes(container.status);
        return notAssignedToCurrent && isAllowedStatus;
    });

    // Group containers by status for display
    const groupedContainers = displayedContainers.reduce((acc, container) => {
        const status = container.status || 'Unknown';
        if (!acc[status]) acc[status] = [];
        acc[status].push(container);
        return acc;
    }, {});

    // Handler for individual container assignment
    const handleAssignContainer = async (container, e) => {
        e.stopPropagation();
        if (!selectedDriver) {
            addToast("Please select a driver first.", "error");
            return;
        }
        
        setAssigningContainerId(container.id);
        try {
            await assignDriverToContainer({
                containersPath,
                eventsPath,
                containerId: container.id,
                selectedDriver,
                containerData: container,
                scheduledReturn // Pass the selected return date
            });
            addToast(`Container ${container.id} assigned to ${selectedDriver}`, "success");
        } catch (error) {
            console.error("Error assigning container:", error);
            addToast("Failed to assign container.", "error");
        } finally {
            setAssigningContainerId(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-sm max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-gray-700 shrink-0">
                    <h3 className="text-lg font-bold text-white">Assign Driver</h3>
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

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Scheduled Return (Optional)</label>
                        <input 
                            type="datetime-local" 
                            value={scheduledReturn}
                            onChange={(e) => setScheduledReturn(e.target.value)}
                            className="w-full p-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    {/* Container Status List Dropdown */}
                    <div className="border border-gray-600 rounded-md overflow-hidden">
                        <button 
                            type="button"
                            onClick={() => setIsContainerListOpen(!isContainerListOpen)}
                            className="w-full p-2 bg-gray-700 text-left text-sm text-gray-300 flex justify-between items-center hover:bg-gray-600 transition-colors"
                        >
                            <span className="font-semibold">Review Containers ({displayedContainers.length})</span>
                            <span className="text-xs">{isContainerListOpen ? '▲' : '▼'}</span>
                        </button>
                        
                        {isContainerListOpen && (
                            <div className="bg-gray-900 p-2 text-xs max-h-64 overflow-y-auto">
                                {Object.keys(groupedContainers).length > 0 ? (
                                    Object.entries(groupedContainers).map(([status, items]) => (
                                        <div key={status} className="mb-2 last:mb-0">
                                            <h4 className="font-bold text-gray-400 border-b border-gray-700 mb-1 pb-1 sticky top-0 bg-gray-900">
                                                {status} <span className="font-normal text-gray-500">({items.length})</span>
                                            </h4>
                                            <ul className="space-y-1">
                                                {items.map(c => (
                                                    <li key={c.id} className="text-gray-300 pl-2 flex justify-between items-center py-1 border-b border-gray-800 last:border-0">
                                                        <span className="font-mono">{c.id}</span>
                                                        <div className="flex items-center gap-2">
                                                            {c.deliveryDriver ? (
                                                                <span className="text-indigo-400 truncate max-w-[80px]" title={`Current: ${c.deliveryDriver}`}>
                                                                    🚚 {c.deliveryDriver}
                                                                </span>
                                                            ) : (
                                                                selectedDriver && (
                                                                    <button
                                                                        onClick={(e) => handleAssignContainer(c, e)}
                                                                        disabled={assigningContainerId === c.id}
                                                                        className="px-2 py-0.5 bg-green-600 hover:bg-green-700 text-white rounded text-[10px] disabled:opacity-50"
                                                                        title={`Assign ${selectedDriver} to this container`}
                                                                    >
                                                                        {assigningContainerId === c.id ? '...' : 'Assign'}
                                                                    </button>
                                                                )
                                                            )}
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-500 text-center py-2">
                                        No assignable containers found.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end pt-2">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-lg text-white text-sm"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
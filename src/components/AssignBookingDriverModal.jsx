// File: src/components/AssignBookingDriverModal.jsx
// Location: src/components

import React, { useState } from 'react';
import { db } from '../firebase'; // Added for direct updates
import { doc, updateDoc, deleteField } from 'firebase/firestore'; // Added for direct updates
import { assignDriverToContainer } from '../services/containerService'; 
import { useAppContext } from '../context/AppContext'; 

export default function AssignBookingDriverModal({
    booking,
    drivers = [],
    containers = [], 
    selectedDriver,
    setSelectedDriver,
    onClose,
    onConfirm, // Kept in props signature but not used for "Assign All" anymore
    isSaving: parentIsSaving,
    initialScheduledDate 
}) {
    const { paths, addToast } = useAppContext(); 
    const { containersPath, eventsPath } = paths;

    const [isContainerListOpen, setIsContainerListOpen] = useState(true); 
    const [processingContainerId, setProcessingContainerId] = useState(null); // Renamed for generic processing state
    
    // Initialize date state
    const [returnDate, setReturnDate] = useState(() => {
        if (initialScheduledDate) {
            const d = initialScheduledDate.toDate ? initialScheduledDate.toDate() : new Date(initialScheduledDate);
            return !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : '';
        }
        return '';
    });

    const [returnHour, setReturnHour] = useState(() => {
        if (initialScheduledDate) {
            const d = initialScheduledDate.toDate ? initialScheduledDate.toDate() : new Date(initialScheduledDate);
            return !isNaN(d.getTime()) ? d.getHours().toString().padStart(2, '0') : '08';
        }
        return '08';
    });

    const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));

    const getScheduledReturnDate = () => {
        if (!returnDate) return null;
        return new Date(`${returnDate}T${returnHour}:00:00`);
    };

    // --- FILTER LOGIC ---
    const ALLOWED_STATUSES = [
        'ALL GOOD, BOOK FOR DELIVERY',
        'NEED SQUISH',
        'CHASSIS NEEDS REPAIR'
    ];

    // Filter containers to show:
    // 1. Containers ready to be assigned (in ALLOWED_STATUSES).
    // 2. Containers ALREADY assigned to the selected driver (so they can be unassigned/edited).
    const displayedContainers = containers.filter(container => {
        const isReady = ALLOWED_STATUSES.includes(container.status);
        const isAssignedToCurrent = selectedDriver && container.deliveryDriver === selectedDriver;
        // Show if it's ready OR if it's already mine (even if status changed to Assigned...)
        // Note: Assigned containers usually have status starting with "Assigned...", so they fail isReady check.
        // We explicitly check deliveryDriver match to include them.
        return isReady || isAssignedToCurrent;
    });

    // Group containers by status for display
    const groupedContainers = displayedContainers.reduce((acc, container) => {
        const status = container.status || 'Unknown';
        if (!acc[status]) acc[status] = [];
        acc[status].push(container);
        return acc;
    }, {});

    // ASSIGN Handler
    const handleAssignContainer = async (container, e) => {
        e.stopPropagation();
        if (!selectedDriver) {
            addToast("Please select a driver first.", "error");
            return;
        }
        
        setProcessingContainerId(container.id);
        const scheduledReturn = getScheduledReturnDate();

        try {
            await assignDriverToContainer({
                containersPath,
                eventsPath,
                containerId: container.id,
                selectedDriver,
                containerData: container,
                scheduledReturn 
            });
            addToast(`Container ${container.id} assigned to ${selectedDriver}`, "success");
        } catch (error) {
            console.error("Error assigning container:", error);
            addToast("Failed to assign container.", "error");
        } finally {
            setProcessingContainerId(null);
        }
    };

    // UNASSIGN Handler (Delete/Undo)
    const handleUnassignContainer = async (container, e) => {
        e.stopPropagation();
        if (!window.confirm(`Unassign ${container.deliveryDriver} from Container ${container.id}?`)) return;

        setProcessingContainerId(container.id);
        try {
            const containerRef = doc(db, containersPath, container.id);
            // Revert status to a safe default "Ready" state
            // In a more complex app, we might store 'previousStatus' on the container, but here we default to Ready.
            await updateDoc(containerRef, {
                status: 'ALL GOOD, BOOK FOR DELIVERY',
                deliveryDriver: deleteField(),
                scheduledReturn: deleteField(),
                lastUpdate: new Date()
            });
            addToast(`Container ${container.id} unassigned.`, "success");
        } catch (error) {
            console.error("Error unassigning container:", error);
            addToast("Failed to unassign container.", "error");
        } finally {
            setProcessingContainerId(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-sm max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center p-4 border-b border-gray-700 shrink-0">
                    <h3 className="text-lg font-bold text-white">Manage Delivery</h3>
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

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Return Date</label>
                            <input 
                                type="date" 
                                value={returnDate}
                                onChange={(e) => setReturnDate(e.target.value)}
                                className="w-full p-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Time (Hour)</label>
                            <select 
                                value={returnHour} 
                                onChange={(e) => setReturnHour(e.target.value)} 
                                className="w-full p-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {hours.map(h => (
                                    <option key={h} value={h}>{h}:00</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Container Status List Dropdown */}
                    <div className="border border-gray-600 rounded-md overflow-hidden">
                        <button 
                            type="button"
                            onClick={() => setIsContainerListOpen(!isContainerListOpen)}
                            className="w-full p-2 bg-gray-700 text-left text-sm text-gray-300 flex justify-between items-center hover:bg-gray-600 transition-colors"
                        >
                            <span className="font-semibold">Containers ({displayedContainers.length})</span>
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
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-indigo-400 truncate max-w-[80px]" title={`Current: ${c.deliveryDriver}`}>
                                                                        🚚 {c.deliveryDriver}
                                                                    </span>
                                                                    {c.deliveryDriver === selectedDriver && (
                                                                        <button
                                                                            onClick={(e) => handleUnassignContainer(c, e)}
                                                                            disabled={processingContainerId === c.id}
                                                                            className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] disabled:opacity-50"
                                                                            title="Unassign / Delete"
                                                                        >
                                                                            {processingContainerId === c.id ? '...' : 'X'}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                selectedDriver && (
                                                                    <button
                                                                        onClick={(e) => handleAssignContainer(c, e)}
                                                                        disabled={processingContainerId === c.id}
                                                                        className="px-2 py-0.5 bg-green-600 hover:bg-green-700 text-white rounded text-[10px] disabled:opacity-50"
                                                                        title={`Assign ${selectedDriver} to this container`}
                                                                    >
                                                                        {processingContainerId === c.id ? '...' : 'Assign'}
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
                                        No relevant containers found.
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end pt-2 gap-3">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm font-bold w-full"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
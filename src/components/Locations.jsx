// File: src/components/Locations.jsx
// Location: src/components

import React, { useState, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { CONTAINER_STATUSES } from '../constants';
import { ArchiveIcon, MapPinIcon, DatabaseIcon } from '../icons'; // Ensure you have MapPinIcon or similar in icons.jsx, otherwise use generic

export default function Locations() {
    // --- Get data from context ---
    const {
        collections: collectionsData,
        containers, // Live containers
        openModal,
        // We might want to trigger the collections modal, but that state is in App.js. 
        // For now, we'll focus on viewing.
    } = useAppContext();

    const collections = collectionsData || {};
    const locations = collections.locations || [];

    // --- Local State ---
    const [viewingLocation, setViewingLocation] = useState(null); // Track selected location for drill-down

    // --- Derived Data: Statistics per location ---
    const locationStats = useMemo(() => {
        // Create a map of locationName -> containerCount
        const stats = {};
        locations.forEach(loc => {
            stats[loc.location] = 0;
        });

        // Count containers
        containers.forEach(container => {
            // Check if container status matches a location name
            // (Assumes status === location name for containers at a location)
            if (stats.hasOwnProperty(container.status)) {
                stats[container.status]++;
            }
        });

        return stats;
    }, [locations, containers]);

    // --- Derived Data: Containers for the viewing location ---
    const selectedLocationContainers = useMemo(() => {
        if (!viewingLocation) return [];
        // Filter live containers at this location
        return containers.filter(c => c.status === viewingLocation.location).sort((a, b) => {
            const dateA = a.lastUpdate?.seconds || 0;
            const dateB = b.lastUpdate?.seconds || 0;
            return dateB - dateA; // Sort by most recently updated
        });
    }, [viewingLocation, containers]);

    // --- Handlers ---
    const handleLocationClick = (location) => {
        setViewingLocation(location);
    };

    const handleBackToGrid = () => {
        setViewingLocation(null);
    };

    // Helper to get emoji for status (though for locations, status IS the location name usually)
    const getStatusEmoji = (status) => {
        const found = CONTAINER_STATUSES.find(s => s.label === status);
        return found ? found.emoji : '📍';
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg min-h-[50vh]">
            <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
                <div className="flex items-center gap-4">
                    {viewingLocation && (
                        <button 
                            onClick={handleBackToGrid}
                            className="text-gray-400 hover:text-white flex items-center gap-1 text-sm font-semibold"
                        >
                            ← Back
                        </button>
                    )}
                    <h2 className="text-2xl font-bold text-white">
                        {viewingLocation ? `Location: ${viewingLocation.location}` : 'Location Overview'}
                    </h2>
                </div>
            </div>

            {viewingLocation ? (
                // --- DETAIL VIEW (CONTAINER GRID) ---
                <div>
                    <div className="bg-gray-700 p-4 rounded-lg mb-6 flex flex-wrap gap-6 text-sm">
                         <div>
                            <span className="text-gray-400 block">Current Inventory</span>
                            <span className="font-bold text-lg text-white">{selectedLocationContainers.length} Containers</span>
                        </div>
                    </div>

                    <h3 className="text-lg font-semibold mb-4 text-gray-300">Containers at {viewingLocation.location}</h3>
                    
                    {selectedLocationContainers.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {selectedLocationContainers.map(container => (
                                <div 
                                    key={container.id} 
                                    onClick={() => openModal(container.id)}
                                    className="bg-gray-600 p-4 rounded-lg cursor-pointer transition-all hover:shadow-lg border border-transparent hover:border-blue-500"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-blue-300 text-lg">{container.id}</span>
                                        <span className="text-xl" title={container.status}>{getStatusEmoji(container.status)}</span>
                                    </div>
                                    <div className="text-sm space-y-1">
                                        <p className="text-gray-300 flex justify-between">
                                            <span>Booking:</span>
                                            <span className="font-medium text-white">{container.booking || 'N/A'}</span>
                                        </p>
                                        <p className="text-gray-400 flex justify-between">
                                            <span>Updated:</span>
                                            <span className="text-xs mt-0.5">
                                                {container.lastUpdate?.seconds ? new Date(container.lastUpdate.seconds * 1000).toLocaleDateString() : 'N/A'}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 bg-gray-700 rounded-lg text-gray-400">
                            No containers currently at this location.
                        </div>
                    )}
                </div>
            ) : (
                // --- GRID VIEW (LOCATIONS) ---
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {locations.map(loc => {
                        const count = locationStats[loc.location] || 0;
                        const isEmpty = count === 0;
                        
                        return (
                            <div 
                                key={loc.docId} 
                                onClick={() => handleLocationClick(loc)}
                                className={`p-5 rounded-lg shadow-md cursor-pointer transition-all duration-200 border border-gray-600 hover:border-blue-500 ${isEmpty ? 'bg-gray-700/50' : 'bg-gray-700'}`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="text-xl font-bold text-white truncate pr-2">{loc.location}</h3>
                                    {/* Icon placeholder (generic) */}
                                    <span className="text-gray-400 text-xl">📍</span>
                                </div>
                                
                                <div className="flex items-end justify-between">
                                    <div>
                                        <span className="text-sm text-gray-400 block">Containers</span>
                                        <span className={`text-2xl font-bold ${isEmpty ? 'text-gray-500' : 'text-blue-400'}`}>
                                            {count}
                                        </span>
                                    </div>
                                    <div className={`px-2 py-1 rounded text-xs font-bold uppercase ${isEmpty ? 'bg-green-900/50 text-green-400' : 'bg-blue-900/50 text-blue-400'}`}>
                                        {isEmpty ? 'Empty' : 'Occupied'}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    
                    {(!locations || locations.length === 0) && (
                        <div className="col-span-full text-center py-16 bg-gray-700/50 rounded-xl border-2 border-dashed border-gray-600 text-gray-400">
                            <p className="text-lg mb-2">No locations defined.</p>
                            <p className="text-sm">Go to "Collections" to add locations.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
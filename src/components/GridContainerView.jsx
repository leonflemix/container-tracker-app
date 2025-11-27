// File: src/components/GridContainerView.jsx

import React from 'react';
import { CONTAINER_STATUSES } from '../constants';
import { PencilIcon, UploadIcon, CameraIcon } from '../icons'; // Reuse icons

export default function GridContainerView({ containers, onEdit, isArchived, collections, recentlyUpdated = [] }) {
    
    const containerTypes = collections?.containerTypes || [];
    const displayContainers = containers || [];

    return (
        <div className="overflow-x-auto bg-gray-800 rounded-lg shadow-lg">
            <table className="min-w-full text-sm text-left text-gray-300">
                <thead className="bg-gray-700 text-xs text-gray-400 uppercase tracking-wider">
                    <tr>
                        <th scope="col" className="px-6 py-3">Container #</th>
                        <th scope="col" className="px-6 py-3">Days</th>
                        <th scope="col" className="px-6 py-3">Status</th>
                        <th scope="col" className="px-6 py-3">Booking #</th>
                        <th scope="col" className="px-6 py-3">Type</th>
                        <th scope="col" className="px-6 py-3">Driver</th>
                        <th scope="col" className="px-6 py-3">Chassis</th>
                        <th scope="col" className="px-6 py-3">Seal #</th>
                        <th scope="col" className="px-6 py-3">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                    {displayContainers.map(container => {
                        let statusInfo = CONTAINER_STATUSES.find(s => s.label === container.status);
                        if (container.status && container.status.startsWith('Assigned to Driver')) {
                            statusInfo = { emoji: '👨‍✈️', label: container.status };
                        }
                        if (!statusInfo) {
                            statusInfo = { emoji: '📍', label: container.status };
                        }

                        const typeInfo = containerTypes.find(t => t.name === container.bookedFor);
                        const typeColor = typeInfo?.color || 'inherit';
                        const isHighlighted = recentlyUpdated.includes(container.id);

                        const calculateDaysInYard = () => {
                            if (isArchived) {
                                return container.daysInYard ?? 'N/A';
                            }
                            if (!container.createdAt) return 'N/A';
                            const oneDay = 1000 * 60 * 60 * 24;
                            const now = new Date();
                            const createdDate = new Date(container.createdAt);
                            return Math.floor((now - createdDate) / oneDay);
                        };
                        const daysInYard = calculateDaysInYard();

                        return (
                            <tr 
                                key={container.id} 
                                className={`hover:bg-gray-700 cursor-pointer ${isHighlighted ? 'highlight-update' : ''}`}
                                onClick={() => onEdit(container)} 
                            >
                                <td className="px-6 py-4 font-medium text-white whitespace-nowrap">{container.id}</td>
                                <td className="px-6 py-4 font-medium text-white whitespace-nowrap">{daysInYard}</td>
                                <td className="px-6 py-4 whitespace-nowrap"><span className="mr-2">{statusInfo.emoji}</span>{statusInfo.label}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{container.booking || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap font-semibold" style={{ color: typeColor }}>
                                    <span 
                                        style={{ backgroundColor: typeColor }} 
                                        className="w-3 h-3 inline-block rounded-full mr-2 border border-gray-400"
                                    ></span>
                                    {container.bookedFor || 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">{container.deliveryDriver || container.truck || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{container.chassis || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{container.seal || 'N/A'}</td>
                                <td className="px-6 py-4">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onEdit(container); }} 
                                        className="text-white bg-blue-600 hover:bg-blue-700 p-2 rounded-lg flex items-center justify-center shadow"
                                        title={isArchived ? "View Details" : "Manage Container"}
                                    >
                                        <PencilIcon />
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
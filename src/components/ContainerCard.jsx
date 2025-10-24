// File: src/components/ContainerCard.jsx

import React from 'react';
import { CONTAINER_STATUSES } from '../constants';
import { CalendarDaysIcon } from '../icons';

export default function ContainerCard({ container, onSelect, isArchived, containerTypes = [], recentlyUpdated = [] }) {
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
        <div 
            onClick={() => onSelect(container)}
            className={`bg-gray-800 p-4 rounded-lg shadow-lg border-2 ${isArchived ? 'border-gray-600 cursor-default' : 'cursor-pointer transition-all duration-300 hover:shadow-blue-500/50 hover:border-blue-500 border-transparent'} ${isHighlighted ? 'highlight-update' : ''}`}
        >
            <div className="flex justify-between items-start">
                <h3 className="text-lg font-bold text-blue-400 break-all">{container.id}</h3>
                <span className="text-2xl">{statusInfo.emoji}</span>
            </div>
            <p className="text-sm text-gray-400 mt-1">{statusInfo.label}</p>
            <div className="mt-3 text-sm">
                <p><span className="font-semibold text-gray-300">Booking:</span> {container.booking || 'N/A'}</p>
                <p>
                    <span className="font-semibold text-gray-300">For:</span> 
                    <span className="font-semibold" style={{ color: typeColor }}> {container.bookedFor || 'N/A'}</span>
                </p>
            </div>
            <div className="mt-3 flex justify-between items-center text-xs text-gray-500">
                <p>
                    {isArchived ? `Archived: ${container.archivedAt ? new Date(container.archivedAt).toLocaleString() : 'N/A'}` : `Updated: ${container.lastUpdate ? new Date(container.lastUpdate).toLocaleString() : 'N/A'}`}
                </p>
                <div className="flex items-center font-semibold">
                    <CalendarDaysIcon />
                    <span>{daysInYard} days</span>
                </div>
            </div>
        </div>
    );
}


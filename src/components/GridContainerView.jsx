import React from 'react';
import { CONTAINER_STATUSES } from '../constants';

export default function GridContainerView({ containers, onEdit, isArchived, collections }) {
    return (
        <div className="overflow-x-auto bg-gray-800 rounded-lg shadow-lg">
            <table className="min-w-full text-sm text-left text-gray-300">
                <thead className="bg-gray-700 text-xs text-gray-400 uppercase tracking-wider">
                    <tr>
                        <th scope="col" className="px-6 py-3">Container #</th>
                        <th scope="col" className="px-6 py-3">Status</th>
                        <th scope="col" className="px-6 py-3">Booking #</th>
                        <th scope="col" className="px-6 py-3">Type</th>
                        <th scope="col" className="px-6 py-3">Delivery Driver</th>
                        <th scope="col" className="px-6 py-3">Chassis</th>
                        <th scope="col" className="px-6 py-3">Seal #</th>
                        <th scope="col" className="px-6 py-3">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                    {containers.map(container => {
                        let statusInfo = CONTAINER_STATUSES.find(s => s.label === container.status);
                        if (container.status && container.status.startsWith('Assigned to Driver')) {
                            statusInfo = { emoji: '👨‍✈️', label: container.status };
                        }
                        if (!statusInfo) {
                            statusInfo = { emoji: '📍', label: container.status };
                        }
                        return (
                            <tr key={container.id} className="hover:bg-gray-700">
                                <td className="px-6 py-4 font-medium text-white whitespace-nowrap">{container.id}</td>
                                <td className="px-6 py-4 whitespace-nowrap"><span className="mr-2">{statusInfo.emoji}</span>{statusInfo.label}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{container.booking || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{container.bookedFor || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{container.deliveryDriver || container.truck || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{container.chassis || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{container.seal || 'N/A'}</td>
                                <td className="px-6 py-4">
                                    <button onClick={() => onEdit(container)} className="text-blue-400 hover:text-blue-300 font-semibold">
                                        {isArchived ? 'View' : 'Edit'}
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
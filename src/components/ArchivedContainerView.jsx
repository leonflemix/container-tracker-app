import React from 'react';
import InputField from './InputField';
import { UndoIcon } from '../icons';
import EventHistory from './EventHistory';

export default function ArchivedContainerView({ container, events, isSaving, onClose, setReviveConfirmOpen }) {
    if (!container) return <div className="p-6 text-center text-gray-400">Loading archived details...</div>;
    return (
        <div className="flex flex-col lg:flex-row">
            <div className="p-4 lg:w-1/2 space-y-3">
                <h3 className="text-lg font-semibold text-center mb-4">Archived Container Details</h3>
                {Object.entries(container).map(([key, value]) => {
                    if (typeof value !== 'object' || value === null || value?.toDate) {
                        let displayValue = String(value);
                        const dateValue = (value && value.toDate) ? value.toDate() : (value instanceof Date ? value : null);
                        if (dateValue) displayValue = dateValue.toLocaleString();
                        return <InputField key={key} label={key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')} value={displayValue} disabled />;
                    }
                    return null;
                })}
                <div className="pt-4 flex justify-between items-center gap-3">
                    <button onClick={() => setReviveConfirmOpen(true)} disabled={isSaving} className="flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md">
                        <UndoIcon />
                        Revive Container
                    </button>
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-lg">Close</button>
                </div>
            </div>
            <div className="p-4 lg:w-1/2 lg:border-l border-gray-700">
                <h3 className="text-lg font-semibold mb-3">Event History</h3>
                <EventHistory events={events} />
            </div>
        </div>
    );
}
// File: src/components/AssignedDriverPanel.jsx
// Location: src/components

import React from 'react';
import InputField from './InputField';

export default function AssignedDriverPanel({
    container,
    collections,
    events,
    denialStep,
    setDenialStep,
    isSaving,
    setDeleteConfirmOpen,
    handleUndo,
    handlePierResponse,
    handleReturnToTilter,
    handleNeedsUpdatesAfterDenial,
    onClose
}) {
    const driver = collections.drivers.find(d => d.name === container.deliveryDriver);

    // --- BUG FIX: Updated Undo logic to match EditContainerForm ---
    const lastEvent = events[0];
    const isUndoDisabled = (
        isSaving ||
        !lastEvent ||
        lastEvent.details.action.startsWith('Container created') ||
        !lastEvent.details.previousData // Check for the new robust undo field
    );
    const undoTitle = isUndoDisabled ?
        (!lastEvent ? "No history to undo" : "Cannot undo this action (e.g., creation or old event)")
        : "Undo Last Update";
    // --- End Bug Fix ---

    if (denialStep === 'choose') {
        return (
            <div className="p-6 text-center">
                <h3 className="text-lg font-semibold mb-4">What is the next step for this denied container?</h3>
                <div className="flex justify-center gap-4">
                    <button onClick={handleReturnToTilter} disabled={isSaving} className="py-2 px-4 bg-orange-600 hover:bg-orange-500 rounded-lg">Return to Tilter/Location</button>
                    <button onClick={handleNeedsUpdatesAfterDenial} disabled={isSaving} className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 rounded-lg">Needs Manual Update</button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6">
            <div className="space-y-3 mb-6">
                <h3 className="text-lg font-semibold text-center">{container.status}</h3>
                <InputField label="Container #" value={container.id} disabled />
                <InputField label="Booking #" value={container.booking} disabled />
                {driver && (
                    <>
                        <InputField label="Driver ID" value={driver.id} disabled />
                        <InputField label="Plate" value={driver.plate} disabled />
                    </>
                )}
            </div>
            <div className="flex justify-between items-center">
                <div>
                    <button onClick={() => setDeleteConfirmOpen(true)} className="py-2 px-4 bg-red-800 hover:bg-red-700 rounded-lg text-sm">Delete</button>
                    <button 
                        onClick={handleUndo} 
                        disabled={isUndoDisabled} // Use new logic
                        title={undoTitle} // Use new title
                        className="py-2 px-4 ml-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg text-sm disabled:bg-yellow-800 disabled:cursor-not-allowed"
                    >
                        Undo
                    </button>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => handlePierResponse(false)} disabled={isSaving} className="py-2 px-4 bg-red-600 hover:bg-red-500 rounded-lg">Denied</button>
                    <button onClick={() => handlePierResponse(true)} disabled={isSaving} className="py-2 px-4 bg-green-600 hover:bg-green-500 rounded-lg">Accepted</button>
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-lg">Close</button>
                </div>
            </div>
        </div>
    );
}

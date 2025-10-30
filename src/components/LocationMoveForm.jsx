// File: src/components/LocationMoveForm.jsx
// Location: src/components

import React from 'react';
import InputField from './InputField';

export default function LocationMoveForm({
    container,
    collections,
    selectedLocation,
    setSelectedLocation,
    handleLocationSubmit,
    isSaving,
    onClose
}) {
    return (
        <form onSubmit={handleLocationSubmit} className="p-4 space-y-4">
            <InputField label="Container #" name="id" value={container.id} disabled={true} />
            <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-300 mb-1">Move to Location *</label>
                <select id="location" name="location" value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)} required className="w-full p-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">-- Select a Location --</option>
                    {collections.locations.map(loc => <option key={loc.docId} value={loc.location}>{loc.location}</option>)}
                </select>
            </div>
            <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-lg">Cancel</button>
                <button type="submit" disabled={isSaving} className="py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:bg-blue-800 disabled:cursor-not-allowed">
                    {isSaving ? 'Saving...' : 'Update Location'}
                </button>
            </div>
        </form>
    );
}

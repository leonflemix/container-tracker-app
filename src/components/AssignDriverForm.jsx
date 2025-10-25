import React from 'react';
import InputField from './InputField';

export default function AssignDriverForm({
    container,
    collections,
    selectedDriver,
    setSelectedDriver,
    handleAssignDriver,
    isSaving,
    onClose
}) {
    return (
        <form onSubmit={handleAssignDriver} className="p-4 space-y-4">
            <InputField label="Container #" name="id" value={container.id} disabled={true} />
            <div>
                <label htmlFor="deliveryDriver" className="block text-sm font-medium text-gray-300 mb-1">Assign Delivery Truck/Driver *</label>
                <select id="deliveryDriver" name="deliveryDriver" value={selectedDriver} onChange={(e) => setSelectedDriver(e.target.value)} required className="w-full p-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">-- Select Driver --</option>
                    {collections.drivers.map(d => <option key={d.docId} value={d.name}>{d.name} - {d.plate}</option>)}
                </select>
            </div>
            <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-lg">Cancel</button>
                <button type="submit" disabled={isSaving} className="py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:bg-blue-800 disabled:cursor-not-allowed">
                    {isSaving ? 'Saving...' : 'Assign Driver'}
                </button>
            </div>
        </form>
    );
}
import React from 'react';
import InputField from './InputField';
import CheckboxField from './CheckboxField';
import { PencilIcon } from '../icons';

export default function EditContainerForm({
    formData,
    handleChange,
    isEditingCoreDetails,
    setIsEditingCoreDetails,
    availableStatuses,
    collections,
    openBookings,
    handleSubmit,
    onClose,
    isSaving,
    setDeleteConfirmOpen,
    handleUndo
}) {
    return (
        <form onSubmit={handleSubmit} className="p-4 lg:w-1/2 space-y-4">
            <InputField label="Container #" name="id" value={formData.id || ''} disabled={true} />
            <InputField label="Tare Weight" name="tareWeight" type="number" value={formData.tareWeight || 0} onChange={handleChange} disabled={!isEditingCoreDetails} className={isEditingCoreDetails ? "ring-2 ring-yellow-500" : ""} />
            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Booking #</label>
                <select name="booking" value={formData.booking || ''} onChange={handleChange} className={`w-full p-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed ${isEditingCoreDetails ? "ring-2 ring-yellow-500" : ""}`} disabled={!isEditingCoreDetails}>
                    <option value={formData.booking}>{formData.booking} (Current)</option>
                    {openBookings.map(b => (b.id !== formData.booking && <option key={b.id} value={b.id}>{b.id} ({b.type})</option>))}
                </select>
            </div>

            <InputField label="Container Type" name="bookedFor" value={formData.bookedFor || ''} disabled={true} />

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                <select name="status" value={formData.status || ''} onChange={handleChange} className="w-full p-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {availableStatuses.map(s => <option key={s.label} value={s.label}>{s.emoji} {s.label}</option>)}
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Truck/Driver</label>
                <select name="truck" value={formData.truck || ''} onChange={handleChange} className="w-full p-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">-- Select Driver --</option>
                    {collections.drivers.map(d => <option key={d.docId} value={d.name}>{d.name} - {d.plate}</option>)}
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Chassis</label>
                <select name="chassis" value={formData.chassis || ''} onChange={handleChange} className="w-full p-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">-- Select Chassis --</option>
                    {collections.chassis.map(c => <option key={c.docId} value={c.id}>{c.id}</option>)}
                </select>
            </div>

            <InputField label="Seal #" name="seal" value={formData.seal || ''} onChange={handleChange} />
            <InputField label="Gross Weight" name="grossWeight" type="number" value={formData.grossWeight || 0} onChange={handleChange} />

            <div className="flex flex-col gap-2 mt-2">
                <CheckboxField label="Holes Before Squish" name="hasHolesBeforeSquish" checked={!!formData.hasHolesBeforeSquish} onChange={handleChange} />
                <CheckboxField label="Holes After Squish" name="hasHolesAfterSquish" checked={!!formData.hasHolesAfterSquish} onChange={handleChange} />
            </div>
            <div className="pt-4 flex justify-between items-center gap-3">
                <div>
                    <button type="button" onClick={() => setDeleteConfirmOpen(true)} className="py-2 px-4 bg-red-600 hover:bg-red-700 rounded-lg text-sm">Delete</button>
                    <button type="button" onClick={handleUndo} disabled className="py-2 px-4 ml-2 bg-yellow-500 hover:bg-yellow-600 rounded-lg text-sm disabled:bg-yellow-800 disabled:cursor-not-allowed">Undo Last Update</button>
                    {!isEditingCoreDetails && (
                        <button type="button" onClick={() => setIsEditingCoreDetails(true)} title="Edit Core Details" className="flex items-center py-2 px-4 ml-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg text-sm">
                            <PencilIcon /> Edit Core
                        </button>
                    )}
                </div>
                <div className="flex gap-3">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-lg">Cancel</button>
                    <button type="submit" disabled={isSaving} className="py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:bg-blue-800 disabled:cursor-not-allowed">{isSaving ? 'Saving...' : 'Save Changes'}</button>
                </div>
            </div>
        </form>
    );
}
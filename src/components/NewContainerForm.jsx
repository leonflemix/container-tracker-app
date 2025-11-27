// File: src/components/NewContainerForm.jsx
// Location: src/components

import React from 'react';
import ImageUploadButtons from './ImageUploadButtons';
import InputField from './InputField';

export default function NewContainerForm({
    formData,
    handleChange,
    handleImageChange,
    handleSubmit,
    openBookings,
    selectedBookingType,
    isImageProcessing,
    isSaving,
    onClose,
    scanFileInputRef,
    uploadFileInputRef,
    validationState // Receive validation state
}) {
    // If validationState is passed, use it, otherwise default (defensive coding)
    const isValid = validationState ? validationState.isValid : true;
    const error = validationState ? validationState.error : null;

    return (
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <ImageUploadButtons
                scanInputRef={scanFileInputRef}
                uploadInputRef={uploadFileInputRef}
                onFileChange={handleImageChange}
                disabled={isImageProcessing || isSaving}
            />
            <div className="flex justify-between items-end gap-4">
                <div className="flex-grow">
                    <label className="block text-sm font-medium text-gray-300 mb-1">Booking # *</label>
                    <select name="booking" value={formData.booking || ''} onChange={handleChange} className="w-full p-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">-- Select an Open Booking --</option>
                        {openBookings.map(b => <option key={b.id} value={b.id}>{b.id} ({b.type})</option>)}
                    </select>
                </div>
            </div>

            {selectedBookingType && <p className="text-sm text-gray-400">Selected Type: <span className="font-semibold text-gray-200">{selectedBookingType}</span></p>}
            
            <div>
                <InputField label="Container #" name="id" value={formData.id || ''} onChange={handleChange} required />
                {!isValid && error && (
                    <p className="text-red-400 text-xs mt-1 animate-pulse">⚠️ {error}</p>
                )}
                {isValid && formData.id && formData.id.length === 11 && (
                    <p className="text-green-400 text-xs mt-1">✅ Valid ISO Container ID</p>
                )}
            </div>

            <InputField label="Tare Weight" name="tareWeight" type="number" value={formData.tareWeight || 0} onChange={handleChange} />
            <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-lg">Cancel</button>
                <button 
                    type="submit" 
                    disabled={isSaving || !isValid} // Disable save if invalid
                    className="py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                    {isSaving ? 'Saving...' : 'Add Container'}
                </button>
            </div>
        </form>
    );
}
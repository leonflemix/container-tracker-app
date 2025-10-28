// File: src/components/BookingModal.jsx
import React, { useState } from 'react';
import { db, Timestamp } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import InputField from './InputField';
import { PencilIcon, PlusCircleIcon } from '../icons';

export default function BookingModal({ onClose, openBookings, filledBookingCounts, bookingsPath, containerTypes, addToast, onSelectBookingForContainerAdd }) {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingBooking, setEditingBooking] = useState(null); // null for new, object for edit
    const [formData, setFormData] = useState({
        id: '',
        quantity: 1,
        type: '',
    });
    const [isSaving, setIsSaving] = useState(false);

    // --- FIX: Add defensive check for containerTypes ---
    const safeContainerTypes = containerTypes || [];
    // ---

    const openForm = (booking = null) => {
        setEditingBooking(booking);
        if (booking) {
            setFormData({
                id: booking.id,
                quantity: booking.quantity,
                type: booking.type,
            });
        } else {
            setFormData({ id: '', quantity: 1, type: '' });
        }
        setIsFormOpen(true);
    };

    const closeForm = () => {
        setIsFormOpen(false);
        setEditingBooking(null);
        setFormData({ id: '', quantity: 1, type: '' });
    };

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseInt(value, 10) : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.id || !formData.quantity || !formData.type) {
            addToast("All fields are required.", 'error');
            return;
        }
        setIsSaving(true);
        const bookingId = (editingBooking ? editingBooking.id : formData.id).toUpperCase();
        const bookingRef = doc(db, bookingsPath, bookingId);
        
        const dataToSave = {
            id: bookingId,
            quantity: formData.quantity,
            type: formData.type,
        };
        
        // Only add createdAt for new bookings
        if (!editingBooking) {
            dataToSave.createdAt = Timestamp.now();
        }

        try {
            // Use setDoc with merge:true to handle both create and update
            await setDoc(bookingRef, dataToSave, { merge: true });
            addToast(`Booking ${dataToSave.id} saved successfully!`, 'success');
            closeForm();
        } catch (error) {
            console.error("Error saving booking:", error);
            addToast("Failed to save booking. See console for details.", 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4"
            onClick={onClose} // --- ADDED: Click backdrop to close ---
        >
            <div 
                className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()} // --- ADDED: Stop click propagation ---
            >
                <header className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold">{isFormOpen ? (editingBooking ? 'Edit Booking' : 'Add New Booking') : 'Open Bookings'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </header>
                
                <div className="p-4 overflow-y-auto">
                    {isFormOpen ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <InputField label="Booking #" name="id" value={formData.id} onChange={handleChange} required disabled={!!editingBooking} />
                            <InputField label="Quantity" name="quantity" type="number" value={formData.quantity} onChange={handleChange} required />
                            <div>
                                <label htmlFor="type" className="block text-sm font-medium text-gray-300 mb-1">Type *</label>
                                <select
                                    id="type"
                                    name="type"
                                    value={formData.type}
                                    onChange={handleChange}
                                    required
                                    className="w-full p-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">-- Select a Type --</option>
                                    {/* --- FIX: Use safeContainerTypes --- */}
                                    {safeContainerTypes.map(type => (
                                        <option key={type.docId} value={type.name}>{type.name}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={closeForm} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-lg">Back to List</button>
                                <button type="submit" disabled={isSaving} className="py-2 px-4 bg-green-600 hover:bg-green-700 rounded-lg disabled:bg-green-800 disabled:cursor-not-allowed">
                                    {isSaving ? 'Saving...' : 'Save Booking'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div>
                            <div className="space-y-3 mb-4">
                                {openBookings.map(booking => (
                                    <div key={booking.id} className="bg-gray-700 p-3 rounded-md flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-white">{booking.id}</p>
                                            <p className="text-sm text-gray-400">{booking.type}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="text-right">
                                                <p className="text-lg font-semibold text-white">{filledBookingCounts[booking.id] || 0} / {booking.quantity}</p>
                                                <p className="text-xs text-gray-400">Filled</p>
                                            </div>
                                            <button onClick={() => openForm(booking)} className="p-2 text-yellow-400 hover:text-yellow-300 hover:bg-gray-600 rounded-full" title="Edit Booking">
                                                <PencilIcon />
                                            </button>
                                            <button onClick={() => onSelectBookingForContainerAdd(booking.id)} className="p-2 text-green-400 hover:text-green-300 hover:bg-gray-600 rounded-full" title="Add Container for this Booking">
                                                <PlusCircleIcon />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end gap-3">
                                 <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-lg">Close</button>
                                <button onClick={() => openForm(null)} className="py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg">
                                    Add New Booking
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


// File: src/components/Bookings.jsx
// Location: src/components

import React, { useState } from 'react';
import { db, Timestamp } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import InputField from './InputField';
import { PencilIcon, PlusCircleIcon } from '../icons';
import { useAppContext } from '../context/AppContext';

export default function Bookings() {
    // --- Get data from context ---
    const {
        openBookings,
        bookings, // Get all bookings if needed, or just open ones
        filledBookingCounts,
        paths,
        collections: collectionsData,
        addToast
    } = useAppContext();
    
    const { bookingsPath } = paths;
    const collections = collectionsData || {};
    const containerTypes = collections.containerTypes || [];

    // --- Local State ---
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingBooking, setEditingBooking] = useState(null);
    const [formData, setFormData] = useState({
        id: '',
        quantity: 1,
        type: '',
    });
    const [isSaving, setIsSaving] = useState(false);

    // --- Handlers (Copied and adapted from BookingModal) ---
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
            await setDoc(bookingRef, dataToSave, { merge: true });
            addToast(`Booking ${dataToSave.id} saved successfully!`, 'success');
            closeForm();
        } catch (error) {
            console.error("Error saving booking:", error);
            addToast("Failed to save booking.", 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg min-h-[50vh]">
            <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
                <h2 className="text-2xl font-bold text-white">Booking Management</h2>
                {!isFormOpen && (
                    <button 
                        onClick={() => openForm(null)} 
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transition-transform transform hover:scale-105"
                    >
                        New Bookings
                    </button>
                )}
            </div>

            {isFormOpen ? (
                <div className="max-w-2xl mx-auto bg-gray-700 p-6 rounded-lg">
                    <h3 className="text-xl font-bold mb-4">{editingBooking ? 'Edit Booking' : 'Create New Booking'}</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <InputField 
                            label="Booking #" 
                            name="id" 
                            value={formData.id} 
                            onChange={handleChange} 
                            required 
                            disabled={!!editingBooking} 
                        />
                        <InputField 
                            label="Quantity" 
                            name="quantity" 
                            type="number" 
                            value={formData.quantity} 
                            onChange={handleChange} 
                            required 
                        />
                        <div>
                            <label htmlFor="type" className="block text-sm font-medium text-gray-300 mb-1">Type *</label>
                            <select
                                id="type"
                                name="type"
                                value={formData.type}
                                onChange={handleChange}
                                required
                                className="w-full p-2 bg-gray-600 text-white rounded-md border border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">-- Select a Type --</option>
                                {containerTypes.map(type => (
                                    <option key={type.docId} value={type.name}>{type.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="pt-6 flex justify-end gap-3">
                            <button type="button" onClick={closeForm} className="py-2 px-4 bg-gray-600 hover:bg-gray-500 rounded-lg text-white">Cancel</button>
                            <button type="submit" disabled={isSaving} className="py-2 px-4 bg-green-600 hover:bg-green-700 rounded-lg text-white disabled:bg-green-800 disabled:cursor-not-allowed">
                                {isSaving ? 'Saving...' : 'Save Booking'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Display Open Bookings */}
                    {(openBookings || []).map(booking => {
                        const filled = (filledBookingCounts || {})[booking.id] || 0;
                        const progress = Math.min((filled / booking.quantity) * 100, 100);
                        
                        return (
                            <div key={booking.id} className="bg-gray-700 p-4 rounded-lg flex justify-between items-center shadow-md">
                                <div className="flex-grow">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-lg font-bold text-white">{booking.id}</h3>
                                        <span className="text-xs bg-gray-600 px-2 py-1 rounded text-gray-300">{booking.type}</span>
                                    </div>
                                    
                                    {/* Progress Bar */}
                                    <div className="w-full bg-gray-800 rounded-full h-2.5 mb-1 max-w-xs">
                                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                                    </div>
                                    <p className="text-xs text-gray-400">{filled} / {booking.quantity} Containers Filled</p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => openForm(booking)} 
                                        className="p-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-yellow-400 transition-colors"
                                        title="Edit Booking"
                                    >
                                        <PencilIcon />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                    
                    {(!openBookings || openBookings.length === 0) && (
                        <div className="col-span-full text-center py-10 text-gray-500">
                            No open bookings found. Click "New Bookings" to start.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
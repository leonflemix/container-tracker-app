// File: src/components/Bookings.jsx
// Location: src/components

import React, { useState, useMemo } from 'react';
import { db, Timestamp } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import InputField from './InputField';
import { PencilIcon, PlusCircleIcon, TruckIcon, ArchiveIcon } from '../icons';
import { useAppContext } from '../context/AppContext';
import { CONTAINER_STATUSES } from '../constants';

export default function Bookings() {
    // --- Get data from context ---
    const {
        openBookings,
        bookings, // Get all bookings if needed, or just open ones
        filledBookingCounts,
        paths,
        collections: collectionsData,
        addToast,
        // New data needed for drill-down
        containers,
        archivedContainers,
        openModal
    } = useAppContext();
    
    const { bookingsPath } = paths;
    const collections = collectionsData || {};
    const containerTypes = collections.containerTypes || [];

    // --- Local State ---
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingBooking, setEditingBooking] = useState(null);
    const [viewingBooking, setViewingBooking] = useState(null); // New: Track selected booking for drill-down
    const [formData, setFormData] = useState({
        id: '',
        quantity: 1,
        type: '',
    });
    const [isSaving, setIsSaving] = useState(false);

    // --- Derived Data: Containers for the viewing booking ---
    const selectedBookingContainers = useMemo(() => {
        if (!viewingBooking) return [];
        const live = containers.filter(c => c.booking === viewingBooking.id);
        const archived = archivedContainers.filter(c => c.booking === viewingBooking.id);
        // Combine and sort by creation date (newest first)
        return [...live, ...archived].sort((a, b) => {
            const dateA = a.createdAt?.seconds || 0;
            const dateB = b.createdAt?.seconds || 0;
            return dateB - dateA;
        });
    }, [viewingBooking, containers, archivedContainers]);

    // --- Handlers ---
    const openForm = (booking = null, e = null) => {
        if (e) e.stopPropagation();
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
        setViewingBooking(null); // Close detail view if opening form
    };

    const closeForm = () => {
        setIsFormOpen(false);
        setEditingBooking(null);
        setFormData({ id: '', quantity: 1, type: '' });
    };

    const handleBookingClick = (booking) => {
        setViewingBooking(booking);
        setIsFormOpen(false);
    };

    const handleBackToGrid = () => {
        setViewingBooking(null);
    };

    const handleAddContainerClick = (bookingId, e) => {
        e.stopPropagation();
        // We can't easily pre-select in the main modal from here without extra logic in App.js,
        // but we can open the modal. For now, let's just open the modal.
        // If you need the pre-select logic, we'd need to lift that state up or pass the handler from App.js.
        // Assuming user wants to view details mostly here.
        openModal(null); 
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

    // Helper to get emoji for status
    const getStatusEmoji = (status) => {
        const found = CONTAINER_STATUSES.find(s => s.label === status);
        return found ? found.emoji : '📍';
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg min-h-[50vh]">
            <div className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
                <div className="flex items-center gap-4">
                    {viewingBooking && (
                        <button 
                            onClick={handleBackToGrid}
                            className="text-gray-400 hover:text-white flex items-center gap-1 text-sm font-semibold"
                        >
                            ← Back
                        </button>
                    )}
                    <h2 className="text-2xl font-bold text-white">
                        {viewingBooking ? `Booking: ${viewingBooking.id}` : 'Booking Management'}
                    </h2>
                </div>
                {!isFormOpen && !viewingBooking && (
                    <button 
                        onClick={(e) => openForm(null, e)} 
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transition-transform transform hover:scale-105"
                    >
                        New Bookings
                    </button>
                )}
            </div>

            {isFormOpen ? (
                // --- FORM VIEW ---
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
            ) : viewingBooking ? (
                // --- DETAIL VIEW (CONTAINER GRID) ---
                <div>
                    <div className="bg-gray-700 p-4 rounded-lg mb-6 flex flex-wrap gap-6 text-sm">
                         <div>
                            <span className="text-gray-400 block">Type</span>
                            <span className="font-bold text-lg text-white">{viewingBooking.type}</span>
                        </div>
                        <div>
                            <span className="text-gray-400 block">Quantity</span>
                            <span className="font-bold text-lg text-white">{viewingBooking.quantity}</span>
                        </div>
                         <div>
                            <span className="text-gray-400 block">Filled</span>
                            <span className="font-bold text-lg text-white">{(filledBookingCounts || {})[viewingBooking.id] || 0}</span>
                        </div>
                    </div>

                    <h3 className="text-lg font-semibold mb-4 text-gray-300">Associated Containers ({selectedBookingContainers.length})</h3>
                    
                    {selectedBookingContainers.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {selectedBookingContainers.map(container => {
                                // Check if archived by looking at properties
                                const isArchived = !!container.archivedAt;
                                return (
                                    <div 
                                        key={container.id} 
                                        onClick={() => openModal(container.id)}
                                        className={`p-4 rounded-lg cursor-pointer transition-all hover:shadow-lg border border-transparent hover:border-blue-500 ${isArchived ? 'bg-gray-700 opacity-75' : 'bg-gray-600'}`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-bold text-blue-300 text-lg">{container.id}</span>
                                            <span className="text-xl" title={container.status}>{getStatusEmoji(container.status)}</span>
                                        </div>
                                        <div className="text-sm space-y-1">
                                            <p className="text-gray-300 flex justify-between">
                                                <span>Status:</span>
                                                <span className="font-medium text-white truncate max-w-[150px] text-right">{container.status}</span>
                                            </p>
                                            <p className="text-gray-400 flex justify-between">
                                                <span>Driver:</span>
                                                <span className="text-gray-200">{container.deliveryDriver || container.truck || '-'}</span>
                                            </p>
                                             <p className="text-gray-400 flex justify-between">
                                                <span>{isArchived ? 'Archived:' : 'Updated:'}</span>
                                                <span className="text-xs mt-0.5">
                                                    {isArchived 
                                                        ? (container.archivedAt?.seconds ? new Date(container.archivedAt.seconds * 1000).toLocaleDateString() : 'N/A')
                                                        : (container.lastUpdate?.seconds ? new Date(container.lastUpdate.seconds * 1000).toLocaleDateString() : 'N/A')
                                                    }
                                                </span>
                                            </p>
                                        </div>
                                        {isArchived && (
                                            <div className="mt-2 pt-2 border-t border-gray-600 text-xs text-yellow-500 flex items-center gap-1">
                                                <ArchiveIcon /> Archived
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-10 bg-gray-700 rounded-lg text-gray-400">
                            No containers found for this booking.
                        </div>
                    )}
                </div>
            ) : (
                // --- GRID VIEW (OPEN BOOKINGS) ---
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(openBookings || []).map(booking => {
                        const filled = (filledBookingCounts || {})[booking.id] || 0;
                        const progress = Math.min((filled / booking.quantity) * 100, 100);
                        
                        return (
                            <div 
                                key={booking.id} 
                                onClick={() => handleBookingClick(booking)}
                                className="bg-gray-700 p-5 rounded-lg shadow-md hover:bg-gray-650 cursor-pointer transition-all duration-200 group relative border border-gray-600 hover:border-blue-500"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">{booking.id}</h3>
                                        <span className="inline-block mt-1 text-xs font-semibold bg-gray-600 text-blue-200 px-2 py-0.5 rounded border border-gray-500">
                                            {booking.type}
                                        </span>
                                    </div>
                                    <div className="flex gap-1">
                                        <button 
                                            onClick={(e) => openForm(booking, e)} 
                                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-full transition-colors z-10"
                                            title="Edit Booking"
                                        >
                                            <PencilIcon />
                                        </button>
                                        <button 
                                            onClick={(e) => handleAddContainerClick(booking.id, e)}
                                            className="p-2 text-gray-400 hover:text-green-400 hover:bg-gray-600 rounded-full transition-colors z-10"
                                            title="Add Container"
                                        >
                                            <PlusCircleIcon />
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm text-gray-300">
                                        <span>Progress</span>
                                        <span className={filled >= booking.quantity ? "text-green-400 font-bold" : ""}>{filled} / {booking.quantity}</span>
                                    </div>
                                    <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                                        <div 
                                            className={`h-full transition-all duration-500 ${filled >= booking.quantity ? 'bg-green-500' : 'bg-blue-600'}`} 
                                            style={{ width: `${progress}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    
                    {(!openBookings || openBookings.length === 0) && (
                        <div className="col-span-full text-center py-16 bg-gray-700/50 rounded-xl border-2 border-dashed border-gray-600 text-gray-400">
                            <p className="text-lg mb-2">No open bookings found.</p>
                            <button 
                                onClick={() => openForm(null)}
                                className="text-blue-400 hover:text-blue-300 underline"
                            >
                                Create your first booking
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
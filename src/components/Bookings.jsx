// File: src/components/Bookings.jsx
// Location: src/components

import React, { useState, useMemo } from 'react';
import { db, Timestamp } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import InputField from './InputField';
import { PencilIcon, PlusCircleIcon, TruckIcon, ArchiveIcon, UndoIcon } from '../icons';
import { useAppContext } from '../context/AppContext';
import { CONTAINER_STATUSES } from '../constants';
import { archiveBooking, unarchiveBooking, assignDriverToBooking } from '../services/containerService';
import AssignBookingDriverModal from './AssignBookingDriverModal'; // Import new modal

export default function Bookings() {
    // --- Get data from context ---
    const {
        bookings,
        archivedBookings,
        filledBookingCounts,
        paths,
        collections: collectionsData,
        addToast,
        containers,
        archivedContainers,
        openModal
    } = useAppContext();
    
    const { bookingsPath, archivedBookingsPath } = paths; 
    const collections = collectionsData || {};
    const containerTypes = collections.containerTypes || [];
    const drivers = collections.drivers || [];

    // --- Local State ---
    const [activeTab, setActiveTab] = useState('active'); // 'active' or 'archived'
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingBooking, setEditingBooking] = useState(null);
    const [viewingBooking, setViewingBooking] = useState(null);
    const [formData, setFormData] = useState({
        id: '',
        quantity: 1,
        type: '',
    });
    const [isSaving, setIsSaving] = useState(false);

    // --- State for Assign Driver Modal ---
    const [assignDriverState, setAssignDriverState] = useState({ isOpen: false, booking: null });
    const [selectedDriverForBooking, setSelectedDriverForBooking] = useState('');

    // --- Derived Data ---
    const visibleBookings = useMemo(() => {
        if (activeTab === 'archived') {
            return archivedBookings || [];
        }
        return bookings || [];
    }, [activeTab, bookings, archivedBookings]);

    const selectedBookingContainers = useMemo(() => {
        if (!viewingBooking) return [];
        const live = containers.filter(c => c.booking === viewingBooking.id);
        const archived = archivedContainers.filter(c => c.booking === viewingBooking.id);
        return [...live, ...archived].sort((a, b) => {
            const dateA = a.createdAt?.seconds || 0;
            const dateB = b.createdAt?.seconds || 0;
            return dateB - dateA;
        });
    }, [viewingBooking, containers, archivedContainers]);
    
    const bookingContainersForAssign = useMemo(() => {
        if (!assignDriverState.booking) return [];
        // Combine live and archived containers for this booking
        const live = containers.filter(c => c.booking === assignDriverState.booking.id);
        const archived = archivedContainers.filter(c => c.booking === assignDriverState.booking.id);
        return [...live, ...archived];
    }, [assignDriverState.booking, containers, archivedContainers]);

    const getFilledCount = (bookingId) => {
        if (activeTab === 'active' && filledBookingCounts && typeof filledBookingCounts[bookingId] === 'number') {
            return filledBookingCounts[bookingId];
        }
        const liveCount = containers.filter(c => c.booking === bookingId).length;
        const archivedCount = archivedContainers.filter(c => c.booking === bookingId).length;
        return liveCount + archivedCount;
    };

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
        setViewingBooking(null);
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
        openModal(null); 
    };

    const handleArchiveClick = async (booking, e) => {
        e.stopPropagation();
        if (!window.confirm(`Are you sure you want to archive Booking ${booking.id}? This will remove it from the Active list.`)) return;
        
        setIsSaving(true);
        try {
            await archiveBooking({ bookingsPath, archivedBookingsPath, booking });
            addToast(`Booking ${booking.id} archived successfully.`, 'success');
        } catch (error) {
            console.error("Error archiving booking:", error);
            addToast("Failed to archive booking.", 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleUnarchiveClick = async (booking, e) => {
        e.stopPropagation();
        if (!window.confirm(`Move Booking ${booking.id} back to Active list?`)) return;
        
        setIsSaving(true);
        try {
            await unarchiveBooking({ bookingsPath, archivedBookingsPath, booking });
            addToast(`Booking ${booking.id} moved back to Active.`, 'success');
        } catch (error) {
            console.error("Error unarchiving booking:", error);
            addToast("Failed to move booking to active.", 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // --- New Handlers for Driver Assignment ---
    const handleOpenAssignDriver = (booking, e) => {
        e.stopPropagation();
        setAssignDriverState({ isOpen: true, booking });
        setSelectedDriverForBooking(booking.assignedDriver || '');
    };

    const handleAssignDriverSubmit = async (e) => {
        if (e) e.preventDefault();
        setIsSaving(true);
        try {
            let targetPath = bookingsPath;
            if (assignDriverState.booking && activeTab === 'archived') {
                targetPath = archivedBookingsPath;
            }
            await assignDriverToBooking({
                bookingPath: targetPath,
                bookingId: assignDriverState.booking.id,
                driverName: selectedDriverForBooking
            });
            addToast('Driver assignment updated successfully', 'success');
            setAssignDriverState({ isOpen: false, booking: null });
        } catch (error) {
            console.error("Error assigning driver:", error);
            addToast("Failed to assign driver.", 'error');
        } finally {
            setIsSaving(false);
        }
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
        
        let targetPath = bookingsPath;
        if (editingBooking && activeTab === 'archived') {
            targetPath = archivedBookingsPath;
        }

        const bookingRef = doc(db, targetPath, bookingId);

        const dataToSave = {
            id: bookingId,
            quantity: formData.quantity,
            type: formData.type,
        };

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

    const getStatusEmoji = (status) => {
        const found = CONTAINER_STATUSES.find(s => s.label === status);
        return found ? found.emoji : '📍';
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg min-h-[50vh]">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 border-b border-gray-700 pb-4 gap-4">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    {viewingBooking ? (
                        <button 
                            onClick={handleBackToGrid}
                            className="text-gray-400 hover:text-white flex items-center gap-1 text-sm font-semibold"
                        >
                            ← Back
                        </button>
                    ) : (
                        <div className="flex bg-gray-700 rounded-lg p-1">
                            <button
                                onClick={() => setActiveTab('active')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'active' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                            >
                                Active Bookings
                            </button>
                            <button
                                onClick={() => setActiveTab('archived')}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'archived' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                            >
                                Archived
                            </button>
                        </div>
                    )}
                    <h2 className="text-2xl font-bold text-white hidden sm:block">
                        {viewingBooking ? `Booking: ${viewingBooking.id}` : ''}
                    </h2>
                </div>
                
                {!isFormOpen && !viewingBooking && activeTab === 'active' && (
                    <button 
                        onClick={(e) => openForm(null, e)} 
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg shadow-md transition-transform transform hover:scale-105 w-full sm:w-auto"
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
                        <InputField label="Booking #" name="id" value={formData.id} onChange={handleChange} required disabled={!!editingBooking} />
                        <InputField label="Quantity" name="quantity" type="number" value={formData.quantity} onChange={handleChange} required />
                        <div>
                            <label htmlFor="type" className="block text-sm font-medium text-gray-300 mb-1">Type *</label>
                            <select id="type" name="type" value={formData.type} onChange={handleChange} required className="w-full p-2 bg-gray-600 text-white rounded-md border border-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                <option value="">-- Select a Type --</option>
                                {containerTypes.map(type => (<option key={type.docId} value={type.name}>{type.name}</option>))}
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
                // --- DETAIL VIEW ---
                <div>
                    <div className="bg-gray-700 p-4 rounded-lg mb-6 flex flex-wrap gap-6 text-sm">
                         <div><span className="text-gray-400 block">Type</span><span className="font-bold text-lg text-white">{viewingBooking.type}</span></div>
                         <div><span className="text-gray-400 block">Quantity</span><span className="font-bold text-lg text-white">{viewingBooking.quantity}</span></div>
                         <div><span className="text-gray-400 block">Filled</span><span className="font-bold text-lg text-white">{getFilledCount(viewingBooking.id)}</span></div>
                         {viewingBooking.assignedDriver && <div><span className="text-gray-400 block">Assigned Driver</span><span className="font-bold text-lg text-blue-300">{viewingBooking.assignedDriver}</span></div>}
                         {viewingBooking.archivedAt && <div><span className="text-gray-400 block">Archived Date</span><span className="font-bold text-lg text-yellow-500">{new Date(viewingBooking.archivedAt.seconds * 1000).toLocaleDateString()}</span></div>}
                    </div>
                    <h3 className="text-lg font-semibold mb-4 text-gray-300">Associated Containers ({selectedBookingContainers.length})</h3>
                    {selectedBookingContainers.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {selectedBookingContainers.map(container => {
                                const isArchived = !!container.archivedAt;
                                return (
                                    <div key={container.id} onClick={() => openModal(container.id)} className={`p-4 rounded-lg cursor-pointer transition-all hover:shadow-lg border border-transparent hover:border-blue-500 ${isArchived ? 'bg-gray-700 opacity-75' : 'bg-gray-600'}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-bold text-blue-300 text-lg">{container.id}</span>
                                            <span className="text-xl" title={container.status}>{getStatusEmoji(container.status)}</span>
                                        </div>
                                        <div className="text-sm space-y-1">
                                            <p className="text-gray-300 flex justify-between"><span>Status:</span><span className="font-medium text-white truncate max-w-[150px] text-right">{container.status}</span></p>
                                            <p className="text-gray-400 flex justify-between"><span>Driver:</span><span className="text-gray-200">{container.deliveryDriver || container.truck || '-'}</span></p>
                                             <p className="text-gray-400 flex justify-between"><span>{isArchived ? 'Archived:' : 'Updated:'}</span><span className="text-xs mt-0.5">{isArchived ? (container.archivedAt?.seconds ? new Date(container.archivedAt.seconds * 1000).toLocaleDateString() : 'N/A') : (container.lastUpdate?.seconds ? new Date(container.lastUpdate.seconds * 1000).toLocaleDateString() : 'N/A')}</span></p>
                                        </div>
                                        {isArchived && <div className="mt-2 pt-2 border-t border-gray-600 text-xs text-yellow-500 flex items-center gap-1"><ArchiveIcon /> Archived</div>}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-10 bg-gray-700 rounded-lg text-gray-400">No containers found for this booking.</div>
                    )}
                </div>
            ) : (
                // --- GRID VIEW ---
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {visibleBookings.map(booking => {
                        const filled = getFilledCount(booking.id);
                        const progress = Math.min((filled / booking.quantity) * 100, 100);
                        const isFull = filled >= booking.quantity;
                        
                        return (
                            <div key={booking.id} onClick={() => handleBookingClick(booking)} className="bg-gray-700 p-5 rounded-lg shadow-md hover:bg-gray-650 cursor-pointer transition-all duration-200 group relative border border-gray-600 hover:border-blue-500">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">{booking.id}</h3>
                                        <div className="flex flex-col gap-1 mt-1">
                                            <span className="inline-block text-xs font-semibold bg-gray-600 text-blue-200 px-2 py-0.5 rounded border border-gray-500 w-fit">{booking.type}</span>
                                            {booking.assignedDriver && <span className="inline-block text-xs font-semibold bg-indigo-900 text-indigo-200 px-2 py-0.5 rounded border border-indigo-700 w-fit flex items-center"><TruckIcon /> {booking.assignedDriver}</span>}
                                        </div>
                                    </div>
                                    <div className="flex gap-1 flex-wrap justify-end max-w-[50%]">
                                        <button onClick={(e) => openForm(booking, e)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-600 rounded-full transition-colors z-10" title="Edit Booking"><PencilIcon /></button>
                                        
                                        {/* Assign Driver Button */}
                                        <button onClick={(e) => handleOpenAssignDriver(booking, e)} className="p-2 text-gray-400 hover:text-indigo-400 hover:bg-gray-600 rounded-full transition-colors z-10" title="Assign Driver"><TruckIcon /></button>

                                        {activeTab === 'active' && !isFull && (
                                            <button onClick={(e) => handleAddContainerClick(booking.id, e)} className="p-2 text-gray-400 hover:text-green-400 hover:bg-gray-600 rounded-full transition-colors z-10" title="Add Container"><PlusCircleIcon /></button>
                                        )}
                                        {activeTab === 'active' && isFull && (
                                            <button onClick={(e) => handleArchiveClick(booking, e)} className="p-2 text-gray-400 hover:text-yellow-400 hover:bg-gray-600 rounded-full transition-colors z-10" title="Archive Full Booking"><ArchiveIcon /></button>
                                        )}
                                        {activeTab === 'archived' && (
                                            <button onClick={(e) => handleUnarchiveClick(booking, e)} className="p-2 text-gray-400 hover:text-green-400 hover:bg-gray-600 rounded-full transition-colors z-10" title="Move back to Active"><UndoIcon /></button>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2 mt-2">
                                    <div className="flex justify-between text-sm text-gray-300">
                                        <span>Progress</span>
                                        <span className={isFull ? "text-green-400 font-bold" : ""}>{filled} / {booking.quantity}</span>
                                    </div>
                                    <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                                        <div className={`h-full transition-all duration-500 ${isFull ? 'bg-green-500' : 'bg-blue-600'}`} style={{ width: `${progress}%` }}></div>
                                    </div>
                                    {isFull && containers.some(c => c.booking === booking.id) && activeTab === 'active' && <p className="text-xs text-yellow-500 mt-1">⚠️ Full but has active containers</p>}
                                </div>
                            </div>
                        );
                    })}
                    {visibleBookings.length === 0 && (
                        <div className="col-span-full text-center py-16 bg-gray-700/50 rounded-xl border-2 border-dashed border-gray-600 text-gray-400">
                            <p className="text-lg mb-2">No {activeTab} bookings found.</p>
                            {activeTab === 'active' && <button onClick={() => openForm(null)} className="text-blue-400 hover:text-blue-300 underline">Create a new booking</button>}
                        </div>
                    )}
                </div>
            )}
            

            {assignDriverState.isOpen && (
                <AssignBookingDriverModal 
                    booking={assignDriverState.booking}
                    drivers={drivers}
                    containers={bookingContainersForAssign}
                    selectedDriver={selectedDriverForBooking}
                    setSelectedDriver={setSelectedDriverForBooking}
                    onConfirm={handleAssignDriverSubmit}
                    onClose={() => setAssignDriverState({ isOpen: false, booking: null })}
                    isSaving={isSaving}
                />
            )}
        </div>
    );
}
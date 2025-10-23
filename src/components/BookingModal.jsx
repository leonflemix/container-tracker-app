import React, { useMemo, useState } from 'react';
import { db, Timestamp } from '../firebase';
import { doc, setDoc, collection } from 'firebase/firestore';
import InputField from './InputField';

export default function BookingModal({ onClose, bookings, containers, archivedContainers, bookingsPath, containerTypes }) {
    const [isAdding, setIsAdding] = useState(false);
    const [formData, setFormData] = useState({
        id: '',
        quantity: 1,
        type: '',
    });
    const [isSaving, setIsSaving] = useState(false);

    const filledCounts = useMemo(() => {
        return bookings.reduce((acc, booking) => {
            const liveCount = containers.filter(c => c.booking === booking.id).length;
            const archivedCount = archivedContainers.filter(c => c.booking === booking.id).length;
            acc[booking.id] = liveCount + archivedCount;
            return acc;
        }, {});
    }, [bookings, containers, archivedContainers]);

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
            alert("All fields are required.");
            return;
        }
        setIsSaving(true);
        const bookingRef = doc(db, bookingsPath, formData.id.toUpperCase());
        const dataToSave = {
            ...formData,
            id: formData.id.toUpperCase(),
            createdAt: Timestamp.now(),
        };

        try {
            await setDoc(bookingRef, dataToSave);
            setIsAdding(false);
        } catch (error) {
            console.error("Error saving booking:", error);
            alert("Failed to save booking. See console for details.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
                <header className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold">{isAdding ? 'Add New Booking' : 'Open Bookings'}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </header>
                
                <div className="p-4 overflow-y-auto">
                    {isAdding ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <InputField label="Booking #" name="id" value={formData.id} onChange={handleChange} required />
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
                                    {containerTypes.map(type => (
                                        <option key={type.docId} value={type.name}>{type.name}</option>
                                    ))}
                                </select>
                            </div>
                            
                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsAdding(false)} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-lg">Back to List</button>
                                <button type="submit" disabled={isSaving} className="py-2 px-4 bg-green-600 hover:bg-green-700 rounded-lg disabled:bg-green-800 disabled:cursor-not-allowed">
                                    {isSaving ? 'Saving...' : 'Save Booking'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <div>
                            <div className="space-y-3 mb-4">
                                {bookings.map(booking => (
                                    <div key={booking.id} className="bg-gray-700 p-3 rounded-md flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-white">{booking.id}</p>
                                            <p className="text-sm text-gray-400">{booking.type}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-semibold text-white">{filledCounts[booking.id] || 0} / {booking.quantity}</p>
                                            <p className="text-xs text-gray-400">Filled</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end gap-3">
                                 <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-lg">Close</button>
                                <button onClick={() => setIsAdding(true)} className="py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg">
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
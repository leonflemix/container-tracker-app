// File: src/components/DriverPage.jsx
// Location: src/components

import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { useAppContext } from '../context/AppContext';
import { TruckIcon, CalendarDaysIcon, MapPinIcon } from '../icons';

// Simple Icons for this page
const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);
const BoxIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
);

export default function DriverPage() {
    const { 
        collections: collectionsData, 
        containers, 
        bookings, 
        paths,
        openModal 
    } = useAppContext();

    const collections = collectionsData || {};
    const drivers = collections.drivers || [];
    const { bookingsPath } = paths;
    const pickupsPath = bookingsPath ? bookingsPath.replace('bookings', 'pickups') : null;

    // --- State ---
    const [selectedDriverName, setSelectedDriverName] = useState(() => localStorage.getItem('currentDriverName') || '');
    const [pickups, setPickups] = useState([]);

    // Persist selected driver
    useEffect(() => {
        if (selectedDriverName) {
            localStorage.setItem('currentDriverName', selectedDriverName);
        }
    }, [selectedDriverName]);

    // Fetch Pickups
    useEffect(() => {
        if (!pickupsPath) return;
        const q = query(collection(db, pickupsPath));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const pickupsData = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data(),
                scheduledDate: doc.data().scheduledDate?.toDate ? doc.data().scheduledDate.toDate() : null
            }));
            setPickups(pickupsData);
        });
        return () => unsubscribe();
    }, [pickupsPath]);

    // --- Filter Data for Selected Driver ---
    const myDeliveries = useMemo(() => {
        if (!selectedDriverName) return [];
        // Active containers assigned to this driver
        return containers.filter(c => c.deliveryDriver === selectedDriverName);
    }, [containers, selectedDriverName]);

    const myPickups = useMemo(() => {
        if (!selectedDriverName) return [];
        return pickups.filter(p => p.driver === selectedDriverName);
    }, [pickups, selectedDriverName]);

    const myBookings = useMemo(() => {
        if (!selectedDriverName) return [];
        // Bookings explicitly assigned to this driver
        return bookings.filter(b => b.assignedDriver === selectedDriverName);
    }, [bookings, selectedDriverName]);

    if (!selectedDriverName) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] bg-gray-800 rounded-lg p-8">
                <div className="bg-gray-700 p-4 rounded-full mb-4">
                    <UserIcon />
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">Driver Portal Login</h2>
                <div className="w-full max-w-xs">
                    <label className="block text-sm font-medium text-gray-400 mb-2">Select Your Profile</label>
                    <select 
                        value={selectedDriverName} 
                        onChange={(e) => setSelectedDriverName(e.target.value)} 
                        className="w-full p-3 bg-gray-900 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">-- Choose Driver --</option>
                        {drivers.map(d => (
                            <option key={d.docId} value={d.name}>{d.name}</option>
                        ))}
                    </select>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header / Driver Info */}
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-600 p-3 rounded-full text-white">
                        <TruckIcon />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Welcome, {selectedDriverName}</h1>
                        <p className="text-gray-400 text-sm">
                            {myDeliveries.length} Deliveries • {myPickups.length} Collections Pending
                        </p>
                    </div>
                </div>
                <button 
                    onClick={() => setSelectedDriverName('')}
                    className="text-sm text-gray-400 hover:text-white underline"
                >
                    Switch Driver
                </button>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. Deliveries Panel */}
                <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                    <div className="p-4 border-b border-gray-700 bg-gray-750 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <BoxIcon /> 
                            Active Deliveries 
                            <span className="bg-blue-600 text-xs px-2 py-0.5 rounded-full">{myDeliveries.length}</span>
                        </h3>
                    </div>
                    <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                        {myDeliveries.length > 0 ? (
                            myDeliveries.map(container => (
                                <div 
                                    key={container.id} 
                                    onClick={() => openModal(container.id)}
                                    className="bg-gray-700 p-4 rounded-lg cursor-pointer hover:border-blue-500 border border-transparent transition-all"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="font-bold text-blue-300 text-lg">{container.id}</span>
                                        <span className="text-xs font-mono bg-gray-900 px-2 py-1 rounded text-gray-400">
                                            {container.status}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-300 space-y-1">
                                        <div className="flex justify-between">
                                            <span>Booking:</span>
                                            <span className="text-white">{container.booking}</span>
                                        </div>
                                        {container.scheduledReturn && (
                                            <div className="flex justify-between text-yellow-400 font-semibold">
                                                <span>Return By:</span>
                                                <span>{new Date(container.scheduledReturn.seconds * 1000).toLocaleString()}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500 text-center py-8">No active deliveries assigned.</p>
                        )}
                    </div>
                </div>

                {/* 2. Collections Panel */}
                <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                    <div className="p-4 border-b border-gray-700 bg-gray-750 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <TruckIcon /> 
                            Scheduled Collections
                            <span className="bg-green-600 text-xs px-2 py-0.5 rounded-full">{myPickups.length}</span>
                        </h3>
                    </div>
                    <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                        {myPickups.length > 0 ? (
                            myPickups.map(pickup => (
                                <div 
                                    key={pickup.id} 
                                    className="bg-gray-700 p-4 rounded-lg border-l-4 border-green-500"
                                >
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="font-bold text-green-300 text-lg">COLLECTION</span>
                                        {pickup.scheduledDate && (
                                            <span className="text-sm bg-gray-900 px-2 py-1 rounded text-gray-300 flex items-center gap-1">
                                                <CalendarDaysIcon />
                                                {pickup.scheduledDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-sm text-gray-300">
                                        <p className="mb-1"><span className="text-gray-500">Booking:</span> {pickup.bookingId}</p>
                                        <p className="mb-1"><span className="text-gray-500">Date:</span> {pickup.scheduledDate?.toLocaleDateString()}</p>
                                        <div className="mt-3">
                                            {/* In future updates, buttons like "Arrived" or "Picked Up" would go here */}
                                            <button 
                                                className="w-full py-2 bg-gray-600 hover:bg-green-700 text-white rounded text-sm transition-colors"
                                                onClick={() => openModal(null)} // Or open a specific collection modal
                                            >
                                                Start Collection
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500 text-center py-8">No collections scheduled.</p>
                        )}
                    </div>
                </div>

                {/* 3. Assigned Bookings (Overview) */}
                <div className="col-span-1 lg:col-span-2 bg-gray-800 rounded-lg shadow-lg overflow-hidden">
                    <div className="p-4 border-b border-gray-700 bg-gray-750">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <MapPinIcon /> 
                            Booking Responsibility
                            <span className="bg-indigo-600 text-xs px-2 py-0.5 rounded-full">{myBookings.length}</span>
                        </h3>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {myBookings.length > 0 ? (
                            myBookings.map(booking => (
                                <div key={booking.id} className="bg-gray-700 p-4 rounded-lg flex flex-col justify-between">
                                    <div>
                                        <h4 className="font-bold text-white text-lg">{booking.id}</h4>
                                        <p className="text-sm text-gray-400">{booking.type}</p>
                                        {booking.deadline && (
                                            <p className="text-xs text-red-300 mt-1">Deadline: {new Date(booking.deadline.seconds * 1000).toLocaleDateString()}</p>
                                        )}
                                    </div>
                                    <div className="mt-4 pt-3 border-t border-gray-600">
                                        <span className="text-xs text-indigo-300 uppercase font-bold">Primary Driver</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="col-span-full text-gray-500 text-center py-4">No full bookings assigned as primary driver.</p>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
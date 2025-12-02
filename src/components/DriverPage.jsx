// File: src/components/DriverPage.jsx
// Location: src/components

import React, { useState, useMemo, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { useAppContext } from '../context/AppContext';
import { TruckIcon, CalendarDaysIcon, PlusCircleIcon } from '../icons';

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

    // --- Login Screen ---
    if (!selectedDriverName) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] bg-gray-900 p-4">
                <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-sm text-center border border-gray-700">
                    <div className="bg-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                        <UserIcon />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Driver Portal</h2>
                    <p className="text-gray-400 mb-6 text-sm">Please select your profile to view your schedule.</p>
                    
                    <div className="text-left">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Select Driver</label>
                        <select 
                            value={selectedDriverName} 
                            onChange={(e) => setSelectedDriverName(e.target.value)} 
                            className="w-full p-4 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg appearance-none"
                        >
                            <option value="">-- Choose Name --</option>
                            {drivers.map(d => (
                                <option key={d.docId} value={d.name}>{d.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="pb-20 max-w-lg mx-auto"> 
            {/* Mobile Header */}
            <div className="sticky top-0 z-20 bg-gray-900/95 backdrop-blur border-b border-gray-800 p-4 mb-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-600 p-2 rounded-full text-white shadow-lg">
                        <TruckIcon />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white leading-tight">{selectedDriverName}</h1>
                        <p className="text-xs text-gray-400">
                            {myDeliveries.length} Deliveries • {myPickups.length} Collections
                        </p>
                    </div>
                </div>
                <button 
                    onClick={() => setSelectedDriverName('')}
                    className="text-xs font-semibold bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 px-3 rounded-lg border border-gray-700 transition-colors"
                >
                    Log Out
                </button>
            </div>

            <div className="space-y-6 px-2">
                
                {/* 1. ACTIVE DELIVERIES (Blue) - TOP */}
                <section>
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 px-1 flex justify-between items-end">
                        <span>Active Deliveries</span>
                        <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full">{myDeliveries.length}</span>
                    </h3>
                    
                    {myDeliveries.length > 0 ? (
                        <div className="space-y-3">
                            {myDeliveries.map(container => (
                                <div 
                                    key={container.id} 
                                    onClick={() => openModal(container.id)}
                                    className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-sm active:bg-gray-750 transition-colors cursor-pointer"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-gray-700 p-2 rounded-lg text-blue-400">
                                                <BoxIcon />
                                            </div>
                                            <div>
                                                <span className="block text-lg font-bold text-white">{container.id}</span>
                                                <span className="text-xs text-gray-400">Booking: {container.booking}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status Badge */}
                                    <div className="mt-3 flex justify-between items-center">
                                        <span className="inline-block bg-gray-900 text-gray-300 text-xs px-3 py-1.5 rounded-md font-medium border border-gray-700 truncate max-w-[70%]">
                                            {container.status}
                                        </span>
                                        {container.scheduledReturn && (
                                            <span className="text-xs text-yellow-500 font-bold flex items-center gap-1">
                                                <CalendarDaysIcon />
                                                Due: {new Date(container.scheduledReturn.seconds * 1000).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-gray-800/50 rounded-xl p-8 text-center border-2 border-dashed border-gray-700">
                            <p className="text-gray-500 font-medium">No deliveries assigned.</p>
                        </div>
                    )}
                </section>

                {/* 2. SCHEDULED COLLECTIONS (Green) - BOTTOM */}
                {myPickups.length > 0 && (
                    <section>
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 px-1 flex justify-between items-end">
                            <span>Pickups (Collections)</span>
                            <span className="bg-green-600 text-white text-[10px] px-2 py-0.5 rounded-full">{myPickups.length}</span>
                        </h3>
                        <div className="space-y-3">
                            {myPickups.map(pickup => (
                                <div 
                                    key={pickup.id} 
                                    className="bg-gray-800 p-4 rounded-xl border-l-4 border-green-500 shadow-sm relative overflow-hidden"
                                >
                                    <div className="flex justify-between items-start mb-3 relative z-10">
                                        <div>
                                            <span className="block text-xs text-green-400 font-bold mb-1">COLLECT FROM PORT</span>
                                            <span className="text-xl font-bold text-white block">{pickup.bookingId}</span>
                                        </div>
                                        {pickup.scheduledDate && (
                                            <div className="text-right bg-gray-900/50 p-2 rounded-lg">
                                                <span className="block text-xs text-gray-400 font-bold uppercase">{pickup.scheduledDate.toLocaleDateString([], {weekday: 'short'})}</span>
                                                <span className="block text-lg font-bold text-white">{pickup.scheduledDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <button 
                                        onClick={() => openModal(null)} 
                                        className="w-full mt-2 py-3 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-md"
                                    >
                                        <PlusCircleIcon />
                                        <span>Confirm Collection (Add)</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Empty State Helper */}
                {myPickups.length === 0 && myDeliveries.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
                        <TruckIcon />
                        <p className="mt-4 text-gray-400">You are all caught up!</p>
                        <p className="text-sm text-gray-600">No active jobs assigned to {selectedDriverName}.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
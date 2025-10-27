// File: src/context/AppContext.js

import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useToasts } from '../hooks/useToasts';

// 1. Create the context
const AppContext = createContext(null);

// 2. Create the provider component
export function AppProvider({ children }) {
    const [user, setUser] = useState(null);
    const [containers, setContainers] = useState([]);
    const [archivedContainers, setArchivedContainers] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [archivedBookings, setArchivedBookings] = useState([]);
    const [collectionsData, setCollectionsData] = useState({
        drivers: [],
        locations: [],
        chassis: [],
        containerTypes: [],
    });
    const [loading, setLoading] = useState(true);
    const { addToast } = useToasts();
    const isInitialContainersLoad = useRef(true);

    // --- Paths ---
    const isCanvasEnv = typeof window !== 'undefined' && typeof window.__app_id !== 'undefined';
    const appId = isCanvasEnv ? window.__app_id : 'container-tracker-app';

    const paths = useMemo(() => ({
        containersPath: isCanvasEnv ? `/artifacts/${appId}/public/data/containers` : 'containers',
        archivePath: isCanvasEnv ? `/artifacts/${appId}/public/data/archive` : 'archive',
        eventsPath: isCanvasEnv ? `/artifacts/${appId}/public/data/events` : 'events',
        bookingsPath: isCanvasEnv ? `/artifacts/${appId}/public/data/bookings` : 'bookings',
        archivedBookingsPath: isCanvasEnv ? `/artifacts/${appId}/public/data/archivedBookings` : 'archivedBookings',
        collectionsPaths: {
            drivers: isCanvasEnv ? `/artifacts/${appId}/public/data/drivers` : 'drivers',
            locations: isCanvasEnv ? `/artifacts/${appId}/public/data/locations` : 'locations',
            chassis: isCanvasEnv ? `/artifacts/${appId}/public/data/chassis` : 'chassis',
            containerTypes: isCanvasEnv ? `/artifacts/${appId}/public/data/containerTypes` : 'containerTypes',
        }
    }), [appId, isCanvasEnv]);

    // --- Auth ---
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                try {
                    const initialAuthToken = (typeof window !== 'undefined' && typeof window.__initial_auth_token !== 'undefined') ? window.__initial_auth_token : null;
                    if (initialAuthToken) {
                        await signInWithCustomToken(auth, initialAuthToken);
                    } else {
                        await signInAnonymously(auth);
                    }
                } catch (error) {
                    console.error("Authentication failed:", error);
                }
            }
        });
        return () => unsubscribeAuth();
    }, []);

    // --- Data Listeners ---
    useEffect(() => {
        if (user) {
            const unsubscribes = Object.entries(paths.collectionsPaths).map(([key, path]) =>
                onSnapshot(query(collection(db, path)), (snapshot) => {
                    const data = snapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id }));
                    setCollectionsData(prev => ({ ...prev, [key]: data }));
                })
            );
            return () => unsubscribes.forEach(unsub => unsub());
        }
    }, [user, paths.collectionsPaths]);

    useEffect(() => {
        if (user) {
            const q = query(collection(db, paths.containersPath));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const containersData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    lastUpdate: doc.data().lastUpdate?.toDate(),
                    createdAt: doc.data().createdAt?.toDate()
                }));
                setContainers(containersData);

                if (isInitialContainersLoad.current && containersData.length > 0) {
                    setLoading(false);
                    isInitialContainersLoad.current = false;
                } else if (!isInitialContainersLoad.current) {
                     // We can keep the highlight logic here or in App.js
                }
                
                // Handle loading state in case of empty collection
                if (isInitialContainersLoad.current && snapshot.empty) {
                     setLoading(false);
                     isInitialContainersLoad.current = false;
                }

            }, (error) => {
                console.error("Error fetching containers:", error);
                setLoading(false);
            });
            return () => unsubscribe();
        }
    }, [user, paths.containersPath]);
    
    useEffect(() => {
        if (user) {
            const q = query(collection(db, paths.archivePath));
            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const archiveData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    archivedAt: doc.data().archivedAt?.toDate(),
                    createdAt: doc.data().createdAt?.toDate()
                }));
                setArchivedContainers(archiveData);
            }, (error) => {
                console.error("Error fetching archived containers:", error);
            });
            return () => unsubscribe();
        }
    }, [user, paths.archivePath]);

    useEffect(() => {
        if (user) {
            const q = query(collection(db, paths.bookingsPath));
            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const bookingsData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setBookings(bookingsData);
            }, (error) => {
                console.error("Error fetching bookings:", error);
            });
            return () => unsubscribe();
        }
    }, [user, paths.bookingsPath]);

     useEffect(() => {
        if (user) {
            const q = query(collection(db, paths.archivedBookingsPath));
            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const bookingsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setArchivedBookings(bookingsData);
            }, (error) => {
                console.error("Error fetching archived bookings:", error);
            });
            return () => unsubscribe();
        }
    }, [user, paths.archivedBookingsPath]);

    // --- Derived State ---
    const filledBookingCounts = useMemo(() => {
        const allContainers = [...containers, ...archivedContainers];
        return bookings.reduce((acc, booking) => {
            acc[booking.id] = allContainers.filter(c => c.booking === booking.id).length;
            return acc;
        }, {});
    }, [bookings, containers, archivedContainers]);

    const openBookings = useMemo(() => {
        return bookings.filter(booking => (filledBookingCounts[booking.id] || 0) < booking.quantity);
    }, [bookings, filledBookingCounts]);


    // 3. Provide the values
    const value = {
        user,
        loading,
        containers,
        archivedContainers,
        bookings,
        archivedBookings,
        collectionsData,
        paths,
        openBookings,
        filledBookingCounts,
        addToast,
        isInitialContainersLoad // Pass ref if App.js needs it
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
}

// 4. Create a custom hook to consume the context
export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};


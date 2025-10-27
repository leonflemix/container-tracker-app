// File: src/context/AppContext.js
// Location: src/context

import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { onAuthStateChanged, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useToasts } from '../hooks/useToasts';
import { safeToDate } from '../utils/dates';

// Create the context
const AppContext = createContext(null);

// Create the provider component
export const AppProvider = ({ children }) => {
    const { addToast } = useToasts();

    // --- Auth & Data State ---
    const [user, setUser] = useState(null);
    const [containers, setContainers] = useState([]);
    const [archivedContainers, setArchivedContainers] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [archivedBookings, setArchivedBookings] = useState([]);
    const [collections, setCollections] = (useState({
        drivers: [],
        locations: [],
        chassis: [],
        containerTypes: [],
    }));
    const [loading, setLoading] = useState(true);
    const [recentlyUpdated, setRecentlyUpdated] = useState([]);
    
    // --- Refs for managing initial loads ---
    const eventsInitialized = React.useRef(false);
    const isInitialContainersLoad = React.useRef(true);

    // --- Modal State ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedContainerId, setSelectedContainerId] = useState(null);
    const [selectedContainer, setSelectedContainer] = useState(null);
    const [events, setEvents] = useState([]);

    // --- Environment-aware Paths ---
    const isCanvasEnv = typeof window !== 'undefined' && typeof window.__app_id !== 'undefined';
    const appId = isCanvasEnv ? window.__app_id : 'container-tracker-app';

    const paths = useMemo(() => ({
        containersPath: isCanvasEnv ? `/artifacts/${appId}/public/data/containers` : 'containers',
        archivePath: isCanvasEnv ? `/artifacts/${appId}/public/data/archive` : 'archive',
        eventsPath: isCanvasEnv ? `/artifacts/${appId}/public/data/events` : 'events',
        bookingsPath: isCanvasEnv ? `/artifacts/${appId}/public/data/bookings` : 'bookings',
        archivedBookingsPath: isCanvasEnv ? `/artifacts/${appId}/public/data/archivedBookings` : 'archivedBookings',
        collections: {
            drivers: isCanvasEnv ? `/artifacts/${appId}/public/data/drivers` : 'drivers',
            locations: isCanvasEnv ? `/artifacts/${appId}/public/data/locations` : 'locations',
            chassis: isCanvasEnv ? `/artifacts/${appId}/public/data/chassis` : 'chassis',
            containerTypes: isCanvasEnv ? `/artifacts/${appId}/public/data/containerTypes` : 'containerTypes',
        }
    }), [appId, isCanvasEnv]);


    // --- Auth Effect ---
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

    // --- Data Fetching Effects ---
    useEffect(() => {
        if (user) {
            const unsubscribes = Object.entries(paths.collections).map(([key, path]) =>
                onSnapshot(query(collection(db, path)), (snapshot) => {
                    const data = snapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id }));
                    setCollections(prev => ({ ...prev, [key]: data }));
                })
            );
            return () => unsubscribes.forEach(unsub => unsub());
        }
    }, [user, paths.collections]);

    useEffect(() => {
        if (user) {
            const q = query(collection(db, paths.containersPath));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const containersData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    lastUpdate: safeToDate(doc.data().lastUpdate),
                    createdAt: safeToDate(doc.data().createdAt)
                }));
                setContainers(containersData);

                if (!isInitialContainersLoad.current) {
                    snapshot.docChanges().forEach((change) => {
                        if (change.type === "modified") {
                            const containerId = change.doc.id;
                            setRecentlyUpdated(prev => [...prev, containerId]);
                            setTimeout(() => {
                                setRecentlyUpdated(prev => prev.filter(id => id !== containerId));
                            }, 3000);
                        }
                    });
                }
                if (isInitialContainersLoad.current) {
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
                    archivedAt: safeToDate(doc.data().archivedAt),
                    createdAt: safeToDate(doc.data().createdAt)
                }));
                setArchivedContainers(archiveData);
            }, (error) => console.error("Error fetching archived containers:", error));
            return () => unsubscribe();
        }
    }, [user, paths.archivePath]);

    useEffect(() => {
        if (user) {
            const q = query(collection(db, paths.bookingsPath));
            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const bookingsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setBookings(bookingsData);
            }, (error) => console.error("Error fetching bookings:", error));
            return () => unsubscribe();
        }
    }, [user, paths.bookingsPath]);

     useEffect(() => {
        if (user) {
            const q = query(collection(db, paths.archivedBookingsPath));
            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const bookingsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setArchivedBookings(bookingsData);
            }, (error) => console.error("Error fetching archived bookings:", error));
            return () => unsubscribe();
        }
    }, [user, paths.archivedBookingsPath]);

    // Real-time toast notifications for events
    useEffect(() => {
        if (user) {
            const q = query(collection(db, paths.eventsPath));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                if (!eventsInitialized.current) {
                    eventsInitialized.current = true;
                    return;
                }
                snapshot.docChanges().forEach((change) => {
                    if (change.type === "added") {
                        const newEvent = change.doc.data();
                        addToast(`${newEvent.details.action} for container ${newEvent.containerId}`, 'info');
                    }
                });
            });
            return () => unsubscribe();
        }
    }, [user, paths.eventsPath, addToast]);

    // --- Modal Data Logic ---
    // This effect finds the container *and* fetches its events when the ID changes
    useEffect(() => {
        if (selectedContainerId && user) {
            // Find the container in state
            const foundContainer = containers.find(c => c.id === selectedContainerId) || archivedContainers.find(c => c.id === selectedContainerId);
            setSelectedContainer(foundContainer || null); // Set it (or null if not found)

            // Fetch its events
            const q = query(collection(db, paths.eventsPath), where("containerId", "==", selectedContainerId));
            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const eventsData = querySnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data(), timestamp: safeToDate(doc.data().timestamp) }))
                    .sort((a, b) => b.timestamp - a.timestamp);
                setEvents(eventsData);
            }, (error) => {
                console.error("Error fetching events:", error);
                setEvents([]);
            });
            return () => unsubscribe();

        } else if (selectedContainerId === null) {
            // It's a "New Container"
            setSelectedContainer(null);
            setEvents([]);
        }
    }, [selectedContainerId, user, paths.eventsPath, containers, archivedContainers]);
    
    // --- Memoized Derived State ---
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
    
    // --- Modal Public API ---
    const openModal = useCallback((containerId) => {
        setSelectedContainerId(containerId); // This triggers the useEffect above
        setIsModalOpen(true);
    }, []);

    const closeModal = useCallback(() => {
        setIsModalOpen(false);
        setSelectedContainerId(null);
        setSelectedContainer(null);
        setEvents([]);
    }, []);

    // --- Value to provide to consumers ---
    const value = {
        // Data
        user,
        containers,
        archivedContainers,
        bookings,
        archivedBookings,
        collections,
        loading,
        recentlyUpdated,
        paths,

        // Derived Data
        filledBookingCounts,
        openBookings,
        
        // Modal State & Data
        isModalOpen,
        selectedContainerId,
        selectedContainer,
        events,
        
        // Actions
        addToast,
        openModal,
        closeModal,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

// Create the custom hook
export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppProvider');
    }
    return context;
};


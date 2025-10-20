// File: src/container-tracker-app.jsx (or src/App.js)
// Location: In the 'src' directory of your React project.

import React, { useState, useEffect, useMemo } from 'react';
import { signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { auth, db } from './firebase';
import { CONTAINER_STATUSES } from './constants';
import { TruckIcon, PlusIcon, DocumentPlusIcon, DatabaseIcon, ArchiveIcon, ChartIcon } from './icons';
import ContainerCard from './components/ContainerCard';
import GridContainerView from './components/GridContainerView';
import ReportsPage from './components/ReportsPage';
import BookingModal from './components/BookingModal';
import ContainerModal from './components/ContainerModal';
import CollectionsModal from './components/CollectionsModal';
import InputField from './components/InputField';

// Main App Component
export default function App() {
    const [user, setUser] = useState(null);
    const [containers, setContainers] = useState([]);
    const [archivedContainers, setArchivedContainers] = useState([]);
    const [bookings, setBookings] = useState([]);
    const [collectionsData, setCollectionsData] = useState({
        drivers: [],
        locations: [],
        chassis: [],
        containerTypes: [],
    });
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [isCollectionsModalOpen, setIsCollectionsModalOpen] = useState(false);
    const [selectedContainer, setSelectedContainer] = useState(null);
    const [events, setEvents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [pageView, setPageView] = useState('live'); // 'live', 'archive', or 'reports'
    const [view, setView] = useState(() => localStorage.getItem('containerTrackerView') || 'card'); // 'card' or 'grid'

    // --- Save view preference ---
    useEffect(() => {
        localStorage.setItem('containerTrackerView', view);
    }, [view]);

    // --- Dynamically load Tailwind CSS ---
    useEffect(() => {
        const scriptId = 'tailwind-cdn';
        if (!document.getElementById(scriptId)) {
            const script = document.createElement('script');
            script.id = scriptId;
            script.src = 'https://cdn.tailwindcss.com';
            document.head.appendChild(script);
        }
    }, []);

    // Adapt paths based on environment. This makes the app portable.
    const isCanvasEnv = typeof window !== 'undefined' && typeof window.__app_id !== 'undefined';
    const appId = isCanvasEnv ? window.__app_id : 'container-tracker-app';

    const containersPath = useMemo(() => isCanvasEnv ? `/artifacts/${appId}/public/data/containers` : 'containers', [appId, isCanvasEnv]);
    const archivePath = useMemo(() => isCanvasEnv ? `/artifacts/${appId}/public/data/archive` : 'archive', [appId, isCanvasEnv]);
    const eventsPath = useMemo(() => isCanvasEnv ? `/artifacts/${appId}/public/data/events` : 'events', [appId, isCanvasEnv]);
    const bookingsPath = useMemo(() => isCanvasEnv ? `/artifacts/${appId}/public/data/bookings` : 'bookings', [appId, isCanvasEnv]);
    const collectionsPaths = useMemo(() => ({
        drivers: isCanvasEnv ? `/artifacts/${appId}/public/data/drivers` : 'drivers',
        locations: isCanvasEnv ? `/artifacts/${appId}/public/data/locations` : 'locations',
        chassis: isCanvasEnv ? `/artifacts/${appId}/public/data/chassis` : 'chassis',
        containerTypes: isCanvasEnv ? `/artifacts/${appId}/public/data/containerTypes` : 'containerTypes',
    }), [appId, isCanvasEnv]);


    // --- Firebase Auth & Data Fetching ---
    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
            } else {
                try {
                    // This logic handles both custom tokens (from your test environment) and standard anonymous sign-in.
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

    useEffect(() => {
        if (user) {
            const unsubscribes = Object.entries(collectionsPaths).map(([key, path]) =>
                onSnapshot(query(collection(db, path)), (snapshot) => {
                    const data = snapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id }));
                    setCollectionsData(prev => ({ ...prev, [key]: data }));
                })
            );
            return () => unsubscribes.forEach(unsub => unsub());
        }
    }, [user, collectionsPaths]);

    useEffect(() => {
        if (user) {
            setLoading(true);
            const q = query(collection(db, containersPath));
            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const containersData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    lastUpdate: doc.data().lastUpdate?.toDate()
                }));
                setContainers(containersData);
                setLoading(false);
            }, (error) => {
                console.error("Error fetching containers:", error);
                setLoading(false);
            });
            return () => unsubscribe();
        }
    }, [user, containersPath]);
    
    // Fetch Archived Containers
    useEffect(() => {
        if (user) {
            const q = query(collection(db, archivePath));
            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const archiveData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    archivedAt: doc.data().archivedAt?.toDate()
                }));
                setArchivedContainers(archiveData);
            }, (error) => {
                console.error("Error fetching archived containers:", error);
            });
            return () => unsubscribe();
        }
    }, [user, archivePath]);

    // Fetch bookings
    useEffect(() => {
        if (user) {
            const q = query(collection(db, bookingsPath));
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
    }, [user, bookingsPath]);

    // Fetch events for selected container
    useEffect(() => {
        if (selectedContainer?.id && user) {
            const q = query(collection(db, eventsPath), where("containerId", "==", selectedContainer.id));
            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const eventsData = querySnapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp?.toDate() }))
                    .sort((a, b) => b.timestamp - a.timestamp);
                setEvents(eventsData);
            }, (error) => {
                console.error("Error fetching events:", error);
            });
            return () => unsubscribe();
        } else {
            setEvents([]);
        }
    }, [selectedContainer, user, eventsPath]);

    // --- Event Handlers ---
    const handleOpenModal = (container = null) => {
        setSelectedContainer(container);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedContainer(null);
        setEvents([]);
    };

    // Filter containers based on search term
    const filteredContainers = useMemo(() => {
        const source = pageView === 'live' ? containers : archivedContainers;
        if (!searchTerm) return source;
        return source.filter(c => 
            c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.booking?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.truck?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.deliveryDriver?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.bookedFor?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [containers, archivedContainers, searchTerm, pageView]);

    const renderMainContent = () => {
        if (pageView === 'reports') {
            return <ReportsPage archivePath={archivePath} collections={collectionsData} />;
        }
        
        return (
            <>
                <div className="mb-4 flex flex-col sm:flex-row gap-4">
                    <input
                        type="text"
                        placeholder="Search by Container #, Booking, Truck..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                     <div className="flex-shrink-0 bg-gray-800 border border-gray-700 rounded-lg p-1 flex">
                        <button onClick={() => setView('card')} className={`px-4 py-2 text-sm font-semibold rounded-md ${view === 'card' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>Card</button>
                        <button onClick={() => setView('grid')} className={`px-4 py-2 text-sm font-semibold rounded-md ${view === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>Grid</button>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-10">Loading...</div>
                ) : view === 'card' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredContainers.map((container) => (
                            <ContainerCard 
                                key={container.id} 
                                container={container} 
                                onSelect={handleOpenModal} 
                                isArchived={pageView === 'archive'}
                                containerTypes={collectionsData.containerTypes}
                            />
                        ))}
                    </div>
                ) : (
                    <GridContainerView 
                        containers={filteredContainers}
                        collections={collectionsData}
                        onEdit={handleOpenModal}
                        isArchived={pageView === 'archive'}
                    />
                )}
            </>
        )
    }

    return (
        <div className="bg-gray-900 text-gray-100 min-h-screen font-sans">
            <div className="container mx-auto p-4">
                <header className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-2">
                    <div className="flex items-center mb-4 sm:mb-0">
                         <TruckIcon />
                         <h1 className="text-2xl font-bold text-white">
                            {pageView === 'live' && 'Container Yard Tracker'}
                            {pageView === 'archive' && 'Archived Containers'}
                            {pageView === 'reports' && 'Reports'}
                        </h1>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <button
                            onClick={() => setPageView(pageView === 'live' ? 'archive' : 'live')}
                            className="flex items-center justify-center bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105 w-full sm:w-auto"
                        >
                            <ArchiveIcon />
                            {pageView === 'archive' ? 'View Live Yard' : 'View Archive'}
                        </button>
                        <button
                            onClick={() => setPageView('reports')}
                            className="flex items-center justify-center bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105 w-full sm:w-auto"
                        >
                            <ChartIcon />
                            Reports
                        </button>
                        <button
                            onClick={() => setIsCollectionsModalOpen(true)}
                            className="flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105 w-full sm:w-auto"
                        >
                            <DatabaseIcon />
                            Collections
                        </button>
                        <button
                            onClick={() => setIsBookingModalOpen(true)}
                            className="flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105 w-full sm:w-auto"
                        >
                            <DocumentPlusIcon />
                            Add Booking
                        </button>
                        <button
                            onClick={() => handleOpenModal(null)}
                            className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105 w-full sm:w-auto"
                        >
                            <PlusIcon />
                            Add Container
                        </button>
                    </div>
                </header>
                {renderMainContent()}
            </div>

            {isModalOpen && (
                <ContainerModal
                    container={selectedContainer}
                    events={events}
                    onClose={handleCloseModal}
                    bookings={bookings}
                    collections={collectionsData}
                    containersPath={containersPath}
                    eventsPath={eventsPath}
                    archivePath={archivePath}
                    isArchived={pageView === 'archive'}
                />
            )}
            {isBookingModalOpen && (
                <BookingModal
                    onClose={() => setIsBookingModalOpen(false)}
                    bookings={bookings}
                    containers={containers}
                    archivedContainers={archivedContainers}
                    bookingsPath={bookingsPath}
                    containerTypes={collectionsData.containerTypes}
                />
            )}
            {isCollectionsModalOpen && (
                <CollectionsModal
                    onClose={() => setIsCollectionsModalOpen(false)}
                    paths={collectionsPaths}
                    collectionsData={collectionsData}
                />
            )}
        </div>
    );
}


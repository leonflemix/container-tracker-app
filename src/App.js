// File: src/App.js

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { auth, db } from './firebase';
import { CONTAINER_STATUSES } from './constants';
import { TruckIcon, PlusIcon, DocumentPlusIcon, DatabaseIcon, ArchiveIcon, ChartIcon, FilterIcon, SortAscIcon, SortDescIcon, HomeIcon, UndoIcon, CalendarDaysIcon, CameraIcon, PencilIcon, PlusCircleIcon } from './icons';
import ContainerCard from './components/ContainerCard';
import GridContainerView from './components/GridContainerView';
import ReportsPage from './components/ReportsPage';
import BookingModal from './components/BookingModal';
import ContainerModal from './components/ContainerModal';
import CollectionsModal from './components/CollectionsModal';
import InputField from './components/InputField';
import { ToastProvider, useToasts } from './hooks/useToasts';
import Dashboard from './components/Dashboard';

// Main App Component Content
function AppContent() {
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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [isCollectionsModalOpen, setIsCollectionsModalOpen] = useState(false);
    const [selectedContainerId, setSelectedContainerId] = useState(null); // Changed to store ID
    const [preselectedBooking, setPreselectedBooking] = useState(null);
    const [events, setEvents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [pageView, setPageView] = useState('dashboard'); // 'dashboard', 'live', 'archive', or 'reports'
    const [view, setView] = useState(() => localStorage.getItem('containerTrackerView') || 'card');
    
    // State for sorting and filtering, now initialized from localStorage
    const [sortConfig, setSortConfig] = useState(() => {
        const savedSort = localStorage.getItem('containerTrackerSort');
        return savedSort ? JSON.parse(savedSort) : { key: 'createdAt', direction: 'ascending' }; // Default to FIFO
    });
    const [filters, setFilters] = useState(() => {
        const savedFilters = localStorage.getItem('containerTrackerFilters');
        return savedFilters ? JSON.parse(savedFilters) : { status: '', bookedFor: '' };
    });
    const [showFilters, setShowFilters] = useState(false);
    const [recentlyUpdated, setRecentlyUpdated] = useState([]);

    const { addToast } = useToasts();
    const eventsInitialized = useRef(false);
    const isInitialContainersLoad = useRef(true);

    // --- Save preferences to localStorage ---
    useEffect(() => {
        localStorage.setItem('containerTrackerView', view);
    }, [view]);

    useEffect(() => {
        localStorage.setItem('containerTrackerSort', JSON.stringify(sortConfig));
    }, [sortConfig]);

    useEffect(() => {
        localStorage.setItem('containerTrackerFilters', JSON.stringify(filters));
    }, [filters]);

    // --- Dynamically load external scripts ---
    useEffect(() => {
        const scripts = [
            { id: 'tailwind-cdn', src: 'https://cdn.tailwindcss.com' },
            { id: 'tesseract-cdn', src: 'https://cdn.jsdelivr.net/npm/tesseract.js@2.1.5/dist/tesseract.min.js' }
        ];

        scripts.forEach(scriptInfo => {
            if (!document.getElementById(scriptInfo.id)) {
                const script = document.createElement('script');
                script.id = scriptInfo.id;
                script.src = scriptInfo.src;
                document.head.appendChild(script);
            }
        });
    }, []);

    // Adapt paths based on environment. This makes the app portable.
    const isCanvasEnv = typeof window !== 'undefined' && typeof window.__app_id !== 'undefined';
    const appId = isCanvasEnv ? window.__app_id : 'container-tracker-app';

    const containersPath = useMemo(() => isCanvasEnv ? `/artifacts/${appId}/public/data/containers` : 'containers', [appId, isCanvasEnv]);
    const archivePath = useMemo(() => isCanvasEnv ? `/artifacts/${appId}/public/data/archive` : 'archive', [appId, isCanvasEnv]);
    const eventsPath = useMemo(() => isCanvasEnv ? `/artifacts/${appId}/public/data/events` : 'events', [appId, isCanvasEnv]);
    const bookingsPath = useMemo(() => isCanvasEnv ? `/artifacts/${appId}/public/data/bookings` : 'bookings', [appId, isCanvasEnv]);
    const archivedBookingsPath = useMemo(() => isCanvasEnv ? `/artifacts/${appId}/public/data/archivedBookings` : 'archivedBookings', [appId, isCanvasEnv]);
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

    // Container listener with highlight logic
    useEffect(() => {
        if (user) {
            const q = query(collection(db, containersPath));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const containersData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    lastUpdate: doc.data().lastUpdate?.toDate(),
                    createdAt: doc.data().createdAt?.toDate()
                }));
                setContainers(containersData);

                // Only trigger highlights for changes after the initial load
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
    }, [user, containersPath]);
    
    useEffect(() => {
        if (user) {
            const q = query(collection(db, archivePath));
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
    }, [user, archivePath]);

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

     useEffect(() => {
        if (user) {
            const q = query(collection(db, archivedBookingsPath));
            const unsubscribe = onSnapshot(q, (querySnapshot) => {
                const bookingsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setArchivedBookings(bookingsData);
            }, (error) => {
                console.error("Error fetching archived bookings:", error);
            });
            return () => unsubscribe();
        }
    }, [user, archivedBookingsPath]);

    // Fetch ALL events to show real-time toasts
    useEffect(() => {
        if (user) {
            const q = query(collection(db, eventsPath));
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
    }, [user, eventsPath, addToast]);
    
    const selectedContainer = useMemo(() => {
        if (!selectedContainerId) return null;
        // Look in both live and archived containers to find the most current version
        return containers.find(c => c.id === selectedContainerId) || archivedContainers.find(c => c.id === selectedContainerId);
    }, [selectedContainerId, containers, archivedContainers]);

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

    // --- Memoized Calculations for Performance ---
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


    // --- Event Handlers ---
    const handleOpenModal = (container = null) => {
        setSelectedContainerId(container ? container.id : null); // Store only the ID
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedContainerId(null);
        setPreselectedBooking(null); // Clear preselection on close
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const requestSort = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleContainerSelectFromDashboard = (container) => {
        setPageView('live');
        handleOpenModal(container);
    };

    const handleSelectBookingForContainerAdd = (bookingId) => {
        setPreselectedBooking(bookingId);
        setIsBookingModalOpen(false);
        handleOpenModal(null); // Open container modal for a new container
    };

    // --- Main Filtering and Sorting Logic ---
    const processedContainers = useMemo(() => {
        let sourceData = pageView === 'live' ? containers : archivedContainers;

        // 1. Filtering
        let filtered = sourceData.filter(c => {
            const searchMatch = !searchTerm ||
                c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.booking?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.truck?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.deliveryDriver?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                c.bookedFor?.toLowerCase().includes(searchTerm.toLowerCase());

            const statusMatch = !filters.status || c.status === filters.status;
            const typeMatch = !filters.bookedFor || c.bookedFor === filters.bookedFor;
            
            return searchMatch && statusMatch && typeMatch;
        });

        // 2. Sorting
        if (sortConfig.key) {
            filtered.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                
                if (aValue == null) return 1;
                if (bValue == null) return -1;

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }

        return filtered;
    }, [containers, archivedContainers, searchTerm, pageView, filters, sortConfig]);

    const renderMainContent = () => {
        if (pageView === 'dashboard') {
            return <Dashboard containers={containers} onContainerSelect={handleContainerSelectFromDashboard} />;
        }
        if (pageView === 'reports') {
            return <ReportsPage archivePath={archivePath} collections={collectionsData} />;
        }
        
        return (
            <>
                {/* Search, View, and Filter Bar */}
                <div className="mb-4 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <input
                            type="text"
                            placeholder="Search by Container #, Booking, Truck..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full p-3 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <div className="flex-shrink-0 flex items-center gap-2">
                             <div className="bg-gray-800 border border-gray-700 rounded-lg p-1 flex">
                                <button onClick={() => setView('card')} className={`px-4 py-2 text-sm font-semibold rounded-md ${view === 'card' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>Card</button>
                                <button onClick={() => setView('grid')} className={`px-4 py-2 text-sm font-semibold rounded-md ${view === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}>Grid</button>
                            </div>
                            <button onClick={() => setShowFilters(!showFilters)} className={`p-3 bg-gray-800 border rounded-lg hover:bg-gray-700 ${showFilters ? 'border-blue-500 text-blue-400' : 'border-gray-700 text-gray-300'}`}>
                                <FilterIcon />
                            </button>
                        </div>
                    </div>
                    {/* Collapsible Filter and Sort Section */}
                    {showFilters && (
                        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex flex-col sm:flex-row gap-4 items-end">
                            {/* Filter Dropdowns */}
                            <div className="flex-grow w-full">
                                <label className="block text-sm font-medium text-gray-300 mb-1">Filter by Status</label>
                                <select name="status" value={filters.status} onChange={handleFilterChange} className="w-full p-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none">
                                    <option value="">All Statuses</option>
                                    {CONTAINER_STATUSES.map(s => <option key={s.label} value={s.label}>{s.label}</option>)}
                                </select>
                            </div>
                             <div className="flex-grow w-full">
                                <label className="block text-sm font-medium text-gray-300 mb-1">Filter by Type</label>
                                <select name="bookedFor" value={filters.bookedFor} onChange={handleFilterChange} className="w-full p-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none">
                                    <option value="">All Types</option>
                                    {collectionsData.containerTypes.map(t => <option key={t.docId} value={t.name}>{t.name}</option>)}
                                </select>
                            </div>
                            {/* Sort Buttons */}
                            <div className="flex-shrink-0">
                                 <label className="block text-sm font-medium text-gray-300 mb-1">Sort by</label>
                                 <div className="flex gap-2">
                                     <button onClick={() => requestSort('createdAt')} className={`flex items-center p-2 rounded-md ${sortConfig.key === 'createdAt' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                         Age {sortConfig.key === 'createdAt' && (sortConfig.direction === 'ascending' ? <SortAscIcon/> : <SortDescIcon/>)}
                                     </button>
                                     <button onClick={() => requestSort('lastUpdate')} className={`flex items-center p-2 rounded-md ${sortConfig.key === 'lastUpdate' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                         Last Update {sortConfig.key === 'lastUpdate' && (sortConfig.direction === 'ascending' ? <SortAscIcon/> : <SortDescIcon/>)}
                                     </button>
                                     <button onClick={() => requestSort('id')} className={`flex items-center p-2 rounded-md ${sortConfig.key === 'id' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                         Container # {sortConfig.key === 'id' && (sortConfig.direction === 'ascending' ? <SortAscIcon/> : <SortDescIcon/>)}
                                     </button>
                                     <button onClick={() => requestSort('bookedFor')} className={`flex items-center p-2 rounded-md ${sortConfig.key === 'bookedFor' ? 'bg-blue-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                         Type {sortConfig.key === 'bookedFor' && (sortConfig.direction === 'ascending' ? <SortAscIcon/> : <SortDescIcon/>)}
                                     </button>
                                 </div>
                            </div>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="text-center py-10">Loading...</div>
                ) : view === 'card' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {processedContainers.map((container) => (
                            <ContainerCard 
                                key={container.id} 
                                container={container} 
                                onSelect={handleOpenModal} 
                                isArchived={pageView === 'archive'}
                                containerTypes={collectionsData.containerTypes}
                                recentlyUpdated={recentlyUpdated}
                            />
                        ))}
                    </div>
                ) : (
                    <GridContainerView 
                        containers={processedContainers}
                        collections={collectionsData}
                        onEdit={handleOpenModal}
                        isArchived={pageView === 'archive'}
                        recentlyUpdated={recentlyUpdated}
                    />
                )}
            </>
        )
    }
    
    const getPageTitle = () => {
        switch (pageView) {
            case 'dashboard': return 'Dashboard';
            case 'live': return 'Container Yard Tracker';
            case 'archive': return 'Archived Containers';
            case 'reports': return 'Reports';
            default: return 'Container Tracker';
        }
    };

    return (
        <div className="bg-gray-900 text-gray-100 min-h-screen font-sans">
            <style>
                {`
                    @keyframes highlight-animation {
                        0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
                        70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
                        100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
                    }
                    .highlight-update {
                        animation: highlight-animation 1.5s ease-out;
                    }
                `}
            </style>
            <div className="container mx-auto p-4">
                <header className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-2">
                    <div className="flex items-center mb-4 sm:mb-0">
                         <h1 className="text-2xl font-bold text-white flex items-center">
                            <TruckIcon /> {getPageTitle()}
                        </h1>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <button
                            onClick={() => setPageView('dashboard')}
                            className="flex items-center justify-center bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105 w-full sm:w-auto"
                        >
                            <HomeIcon />
                            Dashboard
                        </button>
                         <button
                            onClick={() => setPageView('live')}
                            className="flex items-center justify-center bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105 w-full sm:w-auto"
                        >
                            <TruckIcon />
                            Live Yard
                        </button>
                        <button
                            onClick={() => setPageView('archive')}
                            className="flex items-center justify-center bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105 w-full sm:w-auto"
                        >
                            <ArchiveIcon />
                            Archive
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

            {isModalOpen && selectedContainer !== undefined && (
                <ContainerModal
                    key={selectedContainerId}
                    container={selectedContainer}
                    events={events}
                    onClose={handleCloseModal}
                    openBookings={openBookings}
                    collections={collectionsData}
                    containersPath={containersPath}
                    eventsPath={eventsPath}
                    archivePath={archivePath}
                    isArchived={pageView === 'archive'}
                    addToast={addToast}
                    bookingsPath={bookingsPath}
                    archivedBookingsPath={archivedBookingsPath}
                    filledBookingCounts={filledBookingCounts}
                    allContainers={containers}
                    allArchivedContainers={archivedContainers}
                    preselectedBooking={preselectedBooking}
                />
            )}
            {isBookingModalOpen && (
                <BookingModal
                    onClose={() => setIsBookingModalOpen(false)}
                    openBookings={openBookings}
                    filledBookingCounts={filledBookingCounts}
                    bookingsPath={bookingsPath}
                    containerTypes={collectionsData.containerTypes}
                    addToast={addToast}
                    onSelectBookingForContainerAdd={handleSelectBookingForContainerAdd}
                />
            )}
            {isCollectionsModalOpen && (
                <CollectionsModal
                    onClose={() => setIsCollectionsModalOpen(false)}
                    paths={collectionsPaths}
                    collectionsData={collectionsData}
                    addToast={addToast}
                />
            )}
        </div>
    );
}

// Wrap AppContent with the provider
export default function App() {
    return (
        <ToastProvider>
            <AppContent />
        </ToastProvider>
    );
}


// File: src/container-tracker-app.jsx (or src/App.js)
// Location: In the 'src' directory of your React project.

import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { 
    getFirestore,
    collection, 
    doc, 
    setDoc, 
    onSnapshot, 
    addDoc,
    deleteDoc,
    query,
    where,
    Timestamp,
    getDocs,
    writeBatch
} from 'firebase/firestore';

// --- Firebase Initialization ---
// Merged from firebase-config.js to resolve import issues in this environment.

// This configuration is now self-contained. It first checks for the special global
// variables provided by your test environment. If not found, it falls back to
// standard React environment variables (for Vercel deployment), and finally to
// placeholder values for local development.

let firebaseConfig;

try {
  // Use 'window' to safely check for global variables in a browser environment.
  if (typeof window !== 'undefined' && typeof window.__firebase_config !== 'undefined' && window.__firebase_config) {
    // Priority 1: Use the global config from the special test environment.
    firebaseConfig = JSON.parse(window.__firebase_config);
  } else if (process.env.REACT_APP_FIREBASE_CONFIG) {
    // Priority 2: Use the environment variable for Vercel/standard deployments.
    firebaseConfig = JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG);
  } else {
    // Priority 3: Fallback for local development if nothing else is set.
    console.warn("Firebase config not found. Using placeholder values.");
    firebaseConfig = {
      apiKey: "AIzaSyDjM93MuLCX-S8KeZLL_cRe834bmfEWlY8",
      authDomain: "container-tracker-app-4a7d5.firebaseapp.com",
      projectId: "container-tracker-app-4a7d5",
      storageBucket: "container-tracker-app-4a7d5.firebasestorage.app",
      messagingSenderId: "840635230641",
      appId: "1:840635230641:web:986f7472c844357b14b590"
    };
  }
} catch (error) {
  console.error("Error parsing Firebase config:", error);
  firebaseConfig = { apiKey: "INVALID_CONFIG", authDomain: "", projectId: "" };
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Helper Components & Data ---

const CONTAINER_STATUSES = [
    { emoji: '🆕', label: 'New', isUpdateOption: false, isDispatchOption: false },
    { emoji: '🏞️', label: 'In Yard', isUpdateOption: false, isDispatchOption: false },
    { emoji: '🏢', label: 'On Floor', isUpdateOption: false, isDispatchOption: false },
    { emoji: '👨🏻‍🏭', label: 'NEEDS WELDING', isUpdateOption: true, isDispatchOption: true },
    { emoji: '🤛🏻💨', label: 'NEED SQUISH', isUpdateOption: true, isDispatchOption: true },
    { emoji: '🤛🏻💨👨🏻‍🏭', label: 'NEED SQUISH AND WELDING', isUpdateOption: true, isDispatchOption: true },
    { emoji: '⚖️🤛🏻💨', label: 'NEEDS WEIGHT AND SQUISH', isUpdateOption: true, isDispatchOption: true },
    { emoji: '⚖️🤛🏻💨👨🏻‍🏭', label: 'NEEDS EVERYTHING', isUpdateOption: true, isDispatchOption: true },
    { emoji: '👨🏻‍🏭🏭', label: 'IN WORKSHOP', isUpdateOption: true, isDispatchOption: true },
    { emoji: '⚙️', label: 'In Shred Tilter', isUpdateOption: false, isDispatchOption: false },
    { emoji: '⚖️', label: 'In Scale Tilter', isUpdateOption: false, isDispatchOption: false },
    { emoji: '🛤️', label: 'In Track Tilter', isUpdateOption: false, isDispatchOption: false },
    { emoji: '🏗️', label: 'At Crane', isUpdateOption: true, isDispatchOption: false },
    { emoji: '⌛', label: 'WAIT FOR UPDATE FROM OFFICE', isUpdateOption: true, isDispatchOption: true },
    { emoji: '🔥', label: 'Busy PARKED AND WAITING', isUpdateOption: true, isDispatchOption: true },
    { emoji: '👍🏻', label: 'ALL GOOD, BOOK FOR DELIVERY', isUpdateOption: true, isDispatchOption: true },
    { emoji: '☑️', label: 'Loading Complete', isUpdateOption: true, isDispatchOption: false },
    { emoji: '🚛', label: 'En Route to Pier', isUpdateOption: true, isDispatchOption: false },
    { emoji: '💨', label: 'Returned Empty', isUpdateOption: false, isDispatchOption: false },
    { emoji: 'Y', label: 'Pier Accepted', isUpdateOption: false, isDispatchOption: false },
    { emoji: '🚫', label: 'Denied', isUpdateOption: false, isDispatchOption: false },
    { emoji: '🛞', label: 'CHASSIS NEEDS REPAIR', isUpdateOption: true, isDispatchOption: true },
    { emoji: '📝', label: 'Docs Issue', isUpdateOption: false, isDispatchOption: false },
    { emoji: '☢️', label: 'Nuclear (On Hold)', isUpdateOption: true, isDispatchOption: false },
    { emoji: '👨‍✈️', label: 'Assigned to Driver', isUpdateOption: false, isDispatchOption: false }, // Dynamic label handled in code
];


const TruckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-5 w-5"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>
);

const PlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
);

const DocumentPlusIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="12" y1="18" x2="12" y2="12"></line>
        <line x1="9" y1="15" x2="15" y2="15"></line>
    </svg>
);

const DatabaseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 mr-2">
        <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
    </svg>
);


// Main App Component
export default function App() {
    const [user, setUser] = useState(null);
    const [containers, setContainers] = useState([]);
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
        if (!searchTerm) return containers;
        return containers.filter(c => 
            c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.booking?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.truck?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.bookedFor?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [containers, searchTerm]);


    return (
        <div className="bg-gray-900 text-gray-100 min-h-screen font-sans">
            <div className="container mx-auto p-4">
                <header className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-2">
                    <div className="flex items-center mb-4 sm:mb-0">
                         <TruckIcon />
                         <h1 className="text-2xl font-bold text-white">Container Yard Tracker</h1>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
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
                    <div className="text-center py-10">Loading containers...</div>
                ) : view === 'card' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredContainers.map((container) => (
                            <ContainerCard key={container.id} container={container} onSelect={handleOpenModal} />
                        ))}
                    </div>
                ) : (
                    <GridContainerView 
                        containers={filteredContainers}
                        collections={collectionsData}
                        onEdit={handleOpenModal}
                    />
                )}
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
                />
            )}
            {isBookingModalOpen && (
                <BookingModal
                    onClose={() => setIsBookingModalOpen(false)}
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

// Card component for displaying a single container
const ContainerCard = ({ container, onSelect }) => {
    let statusInfo = CONTAINER_STATUSES.find(s => s.label === container.status);
    if (container.status.startsWith('Assigned to Driver')) {
        statusInfo = { emoji: '👨‍✈️', label: container.status };
    }
    if (!statusInfo) {
        statusInfo = { emoji: '📍', label: container.status };
    }
    
    return (
        <div 
            onClick={() => onSelect(container)}
            className="bg-gray-800 p-4 rounded-lg shadow-lg cursor-pointer transition-all duration-300 hover:shadow-blue-500/50 hover:border-blue-500 border-2 border-transparent"
        >
            <div className="flex justify-between items-start">
                <h3 className="text-lg font-bold text-blue-400 break-all">{container.id}</h3>
                <span className="text-2xl">{statusInfo.emoji}</span>
            </div>
            <p className="text-sm text-gray-400 mt-1">{statusInfo.label}</p>
            <div className="mt-3 text-sm">
                <p><span className="font-semibold text-gray-300">Booking:</span> {container.booking || 'N/A'}</p>
                <p><span className="font-semibold text-gray-300">For:</span> {container.bookedFor || 'N/A'}</p>
                <p className="text-xs text-gray-500 mt-2">
                    Updated: {container.lastUpdate ? new Date(container.lastUpdate).toLocaleString() : 'N/A'}
                </p>
            </div>
        </div>
    );
};

// Grid View Component
const GridContainerView = ({ containers, collections, onEdit }) => {
    return (
        <div className="overflow-x-auto bg-gray-800 rounded-lg shadow-lg">
            <table className="min-w-full text-sm text-left text-gray-300">
                <thead className="bg-gray-700 text-xs text-gray-400 uppercase tracking-wider">
                    <tr>
                        <th scope="col" className="px-6 py-3">Container #</th>
                        <th scope="col" className="px-6 py-3">Status</th>
                        <th scope="col" className="px-6 py-3">Booking #</th>
                        <th scope="col" className="px-6 py-3">Type</th>
                        <th scope="col" className="px-6 py-3">Truck/Driver</th>
                        <th scope="col" className="px-6 py-3">Chassis</th>
                        <th scope="col" className="px-6 py-3">Seal #</th>
                        <th scope="col" className="px-6 py-3">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                    {containers.map(container => {
                        let statusInfo = CONTAINER_STATUSES.find(s => s.label === container.status);
                        if (container.status.startsWith('Assigned to Driver')) {
                            statusInfo = { emoji: '👨‍✈️', label: container.status };
                        }
                        if (!statusInfo) {
                            statusInfo = { emoji: '📍', label: container.status };
                        }
                        return (
                            <tr key={container.id} className="hover:bg-gray-700">
                                <td className="px-6 py-4 font-medium text-white whitespace-nowrap">{container.id}</td>
                                <td className="px-6 py-4 whitespace-nowrap"><span className="mr-2">{statusInfo.emoji}</span>{statusInfo.label}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{container.booking || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{container.bookedFor || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{container.truck || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{container.chassis || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{container.seal || 'N/A'}</td>
                                <td className="px-6 py-4">
                                    <button onClick={() => onEdit(container)} className="text-blue-400 hover:text-blue-300 font-semibold">
                                        Edit
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};


// Modal for Adding a Booking
const BookingModal = ({ onClose, bookingsPath, containerTypes }) => {
    const [formData, setFormData] = useState({
        id: '',
        quantity: 1,
        type: '',
    });
    const [isSaving, setIsSaving] = useState(false);

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
            onClose();
        } catch (error) {
            console.error("Error saving booking:", error);
            alert("Failed to save booking. See console for details.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
                <header className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold">Add New Booking</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </header>
                
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
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
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-lg">Cancel</button>
                        <button type="submit" disabled={isSaving} className="py-2 px-4 bg-green-600 hover:bg-green-700 rounded-lg disabled:bg-green-800 disabled:cursor-not-allowed">
                            {isSaving ? 'Saving...' : 'Save Booking'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};


// Modal for Adding/Editing a container
const ContainerModal = ({ container, events, onClose, bookings, collections, containersPath, eventsPath, archivePath }) => {
    const isNew = !container;
    const [formData, setFormData] = useState(
        isNew 
        ? { id: '', tareWeight: 0, booking: '' }
        : {
            id: container?.id || '',
            status: container?.status || 'New',
            truck: container?.truck || '',
            deliveryDriver: container?.deliveryDriver || '',
            grossWeight: container?.grossWeight || 0,
            chassis: container?.chassis || '',
            tareWeight: container?.tareWeight || 0,
            seal: container?.seal || '',
            booking: container?.booking || '',
            bookedFor: container?.bookedFor || '',
            hasHolesBeforeSquish: container?.hasHolesBeforeSquish || false,
            hasHolesAfterSquish: container?.hasHolesAfterSquish || false,
        }
    );
    
    const [isSaving, setIsSaving] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState('');
    const [selectedDriver, setSelectedDriver] = useState('');
    const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

    const isAtLocation = useMemo(() => {
        if (!container || !collections.locations) return false;
        return collections.locations.some(loc => loc.location === container.status);
    }, [container, collections.locations]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };
    
    const handleLocationSubmit = async (e) => {
        e.preventDefault();
        if (!selectedLocation) {
            alert("Please select a location.");
            return;
        }
        setIsSaving(true);
        const containerRef = doc(db, containersPath, container.id.toUpperCase());

        try {
            const dataToUpdate = { status: selectedLocation, lastUpdate: Timestamp.now() };
            await setDoc(containerRef, dataToUpdate, { merge: true });

            const eventData = {
                containerId: container.id.toUpperCase(),
                timestamp: Timestamp.now(),
                details: {
                    action: 'Container moved to location',
                    changes: `Status changed from 'New' to '${selectedLocation}'`
                }
            };
            await addDoc(collection(db, eventsPath), eventData);
            onClose();
        } catch (error) {
             console.error("Error updating location:", error);
            alert("Failed to update location.");
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleMarkAsLoaded = async () => {
        setIsSaving(true);
        const containerRef = doc(db, containersPath, container.id.toUpperCase());
        const newStatus = 'Loading Complete';

        try {
            const dataToUpdate = { status: newStatus, lastUpdate: Timestamp.now() };
            await setDoc(containerRef, dataToUpdate, { merge: true });

            const eventData = {
                containerId: container.id.toUpperCase(),
                timestamp: Timestamp.now(),
                details: {
                    action: 'Container loaded',
                    changes: `Status changed from '${container.status}' to '${newStatus}'`
                }
            };
            await addDoc(collection(db, eventsPath), eventData);
            onClose();
        } catch (error) {
             console.error("Error marking as loaded:", error);
            alert("Failed to mark as loaded.");
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleAssignDriver = async (e) => {
        e.preventDefault();
        if (!selectedDriver) {
            alert("Please select a driver to assign.");
            return;
        }
        setIsSaving(true);
        const containerRef = doc(db, containersPath, container.id.toUpperCase());
        const newStatus = `Assigned to Driver - ${selectedDriver}`;

        try {
            const dataToUpdate = { 
                status: newStatus, 
                deliveryDriver: selectedDriver,
                lastUpdate: Timestamp.now() 
            };
            await setDoc(containerRef, dataToUpdate, { merge: true });

            const eventData = {
                containerId: container.id.toUpperCase(),
                timestamp: Timestamp.now(),
                details: {
                    action: 'Assigned to delivery driver',
                    changes: `Status changed from '${container.status}' to '${newStatus}'; deliveryDriver changed from '${container.deliveryDriver || ''}' to '${selectedDriver}'`
                }
            };
            await addDoc(collection(db, eventsPath), eventData);
            onClose();
        } catch (error) {
            console.error("Error assigning driver:", error);
            alert("Failed to assign driver.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const containerId = (isNew ? formData.id : container.id);
        if (!containerId) {
            alert("Container number is required.");
            return;
        }

        if (formData.status === 'ALL GOOD, BOOK FOR DELIVERY') {
            if (!formData.truck || !formData.chassis || !formData.seal || !formData.grossWeight) {
                alert("Please fill in Truck/Driver, Chassis, Seal #, and Gross Weight before booking for delivery.");
                return;
            }
        }

        setIsSaving(true);
        
        const containerRef = doc(db, containersPath, containerId.toUpperCase());
        
        try {
            if (isNew) {
                if (!formData.booking) {
                    alert("Please select a booking.");
                    setIsSaving(false);
                    return;
                }
                const selectedBooking = bookings.find(b => b.id === formData.booking);
                const dataToSave = {
                    id: formData.id.toUpperCase(),
                    seal: '',
                    booking: formData.booking,
                    bookedFor: selectedBooking?.type || 'N/A',
                    status: 'New',
                    lastUpdate: Timestamp.now(),
                    truck: '',
                    deliveryDriver: '',
                    grossWeight: 0,
                    chassis: '',
                    tareWeight: formData.tareWeight || 0,
                    hasHolesBeforeSquish: false,
                    hasHolesAfterSquish: false,
                };
                const eventData = {
                    containerId: formData.id.toUpperCase(),
                    timestamp: Timestamp.now(),
                    details: { action: `Container created with status: New for booking ${formData.booking}` }
                };
                await setDoc(containerRef, dataToSave);
                await addDoc(collection(db, eventsPath), eventData);
            } else {
                 // Regular full form update
                const changes = [];
                for (const key in formData) {
                    if (formData[key] !== container[key]) {
                        changes.push(`${key} changed from '${container[key] || ''}' to '${formData[key]}'`);
                    }
                }
                
                if (changes.length > 0) {
                    const dataToUpdate = { ...formData, lastUpdate: Timestamp.now() };
                    delete dataToUpdate.id; // The ID is the doc key, not a field
                    await setDoc(containerRef, dataToUpdate, { merge: true });
                    
                    const eventData = {
                        containerId: container.id.toUpperCase(),
                        timestamp: Timestamp.now(),
                        details: {
                            action: 'Container updated',
                            changes: changes.join('; ')
                        }
                    };
                    await addDoc(collection(db, eventsPath), eventData);
                }
            }
            onClose();
        } catch (error) {
            console.error("Error saving container:", error);
            alert("Failed to save container. See console for details.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!container) return;
        
        try {
            // Delete container document
            await deleteDoc(doc(db, containersPath, container.id));

            // Batch delete all associated events
            const eventsQuery = query(collection(db, eventsPath), where("containerId", "==", container.id));
            const eventsSnapshot = await getDocs(eventsQuery);
            const batch = writeBatch(db);
            eventsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            
            onClose();
        } catch (error) {
            console.error("Error deleting container and its events:", error);
            alert("Failed to delete container. See console for details.");
        }
    };

    const handleUndo = async () => {
        if (!container || events.length < 1) { // Need at least one event to undo
            alert("Cannot undo. No previous state found.");
            return;
        }
        const lastEvent = events[0];

        // The very first "created" event can't be undone this way.
        if (lastEvent.details.action.startsWith('Container created') || !lastEvent.details.changes) {
            alert("Cannot undo the creation of a container. Please delete it instead.");
            return;
        }
        
        setIsSaving(true);

        try {
            const containerRef = doc(db, containersPath, container.id);
            const changesToRevert = lastEvent.details.changes.split('; ');
            
            let stateToRestore = { ...container };

            changesToRevert.forEach(change => {
                const match = change.match(/(.+) changed from '(.*)' to '(.*)'/); // Use .* to capture empty strings
                if (match) {
                    const [, key, fromValue] = match;
                    
                    if (key in stateToRestore) {
                        const originalType = typeof stateToRestore[key];
                        if (originalType === 'boolean') {
                            stateToRestore[key] = (fromValue === 'true');
                        } else if (originalType === 'number') {
                            stateToRestore[key] = parseFloat(fromValue) || 0;
                        } else {
                            stateToRestore[key] = fromValue;
                        }
                    }
                }
            });

            stateToRestore.lastUpdate = Timestamp.now();
            delete stateToRestore.id;

            // Perform the update and delete in a batch for atomicity
            const batch = writeBatch(db);
            batch.set(containerRef, stateToRestore);
            batch.delete(doc(db, eventsPath, lastEvent.id));
            await batch.commit();
            
            alert("Last update has been successfully undone.");
            onClose();

        } catch (error) {
            console.error("Error undoing last update:", error);
            alert("Failed to undo last update. See console for details.");
        } finally {
            setIsSaving(false);
        }
    };

    const handlePierResponse = async (isAccepted) => {
        setIsSaving(true);
        const batch = writeBatch(db);
        const containerRef = doc(db, containersPath, container.id);

        try {
            if (isAccepted) {
                const archiveRef = doc(db, archivePath, container.id);
                const archivedData = { ...container, status: 'Pier Accepted', archivedAt: Timestamp.now() };
                
                batch.set(archiveRef, archivedData);
                batch.delete(containerRef);

                const eventData = {
                    containerId: container.id.toUpperCase(),
                    timestamp: Timestamp.now(),
                    details: {
                        action: 'Pier Accepted & Archived',
                        changes: `Status changed from '${container.status}' to 'Pier Accepted'. Container moved to archive.`
                    }
                };
                batch.set(doc(collection(db, eventsPath)), eventData);

            } else { // Denied
                const newStatus = 'Denied';
                const dataToUpdate = { status: newStatus, lastUpdate: Timestamp.now() };
                batch.update(containerRef, dataToUpdate);

                const eventData = {
                    containerId: container.id.toUpperCase(),
                    timestamp: Timestamp.now(),
                    details: {
                        action: 'Pier Denied',
                        changes: `Status changed from '${container.status}' to '${newStatus}'.`
                    }
                };
                batch.set(doc(collection(db, eventsPath)), eventData);
            }
            
            await batch.commit();
            onClose();
        } catch (error) {
            console.error(`Error updating pier status:`, error);
            alert("Failed to update pier status.");
        } finally {
            setIsSaving(false);
        }
    };


    const selectedBookingType = useMemo(() => {
        if (isNew && formData.booking) {
            return bookings.find(b => b.id === formData.booking)?.type || null;
        }
        return null;
    }, [formData.booking, bookings, isNew]);

    const availableStatuses = useMemo(() => {
        // For the dispatch form, we only show statuses marked as dispatch options.
        const statuses = CONTAINER_STATUSES.filter(s => s.isDispatchOption);
        
        // Always include the container's current status in the list, even if it's not a standard dispatch option.
        const isCurrentStatusInList = statuses.some(s => s.label === formData.status);
        if (formData.status && !isCurrentStatusInList) {
            const currentStatusInfo = CONTAINER_STATUSES.find(s => s.label === formData.status) || { emoji: '📍', label: formData.status };
            statuses.unshift({ 
                ...currentStatusInfo, // Carry over all properties like emoji, label
                isDispatchOption: true // Ensure it's treated as a selectable option here
            });
        }
        return statuses;
    }, [formData.status]);
    
    const renderContent = () => {
        if (isNew) {
            return (
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Booking # *</label>
                        <select name="booking" value={formData.booking} onChange={handleChange} className="w-full p-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">-- Select a Booking --</option>
                            {bookings.map(b => <option key={b.id} value={b.id}>{b.id} ({b.type})</option>)}
                        </select>
                    </div>
                    {selectedBookingType && <p className="text-sm text-gray-400">Selected Type: <span className="font-semibold text-gray-200">{selectedBookingType}</span></p>}
                     <InputField label="Container #" name="id" value={formData.id} onChange={handleChange} required />
                     <InputField label="Tare Weight" name="tareWeight" type="number" value={formData.tareWeight} onChange={handleChange} />
                     <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-lg">Cancel</button>
                        <button type="submit" disabled={isSaving} className="py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:bg-blue-800 disabled:cursor-not-allowed">
                            {isSaving ? 'Saving...' : 'Add Container'}
                        </button>
                     </div>
                </form>
            );
        }

        if (container.status === 'New') {
            return (
                <form onSubmit={handleLocationSubmit} className="p-4 space-y-4">
                    <InputField label="Container #" name="id" value={container.id} disabled={true} />
                    <div>
                        <label htmlFor="location" className="block text-sm font-medium text-gray-300 mb-1">Move to Location *</label>
                        <select
                            id="location"
                            name="location"
                            value={selectedLocation}
                            onChange={(e) => setSelectedLocation(e.target.value)}
                            required
                            className="w-full p-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">-- Select a Location --</option>
                            {collections.locations.map(loc => (
                                <option key={loc.docId} value={loc.location}>{loc.location}</option>
                            ))}
                        </select>
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-lg">Cancel</button>
                        <button type="submit" disabled={isSaving} className="py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:bg-blue-800 disabled:cursor-not-allowed">
                            {isSaving ? 'Saving...' : 'Update Location'}
                        </button>
                        </div>
                </form>
            );
        }
        
        if (isAtLocation) {
             return (
                <div className="p-4 flex flex-col items-center justify-center">
                    <InputField label="Container #" name="id" value={container.id} disabled={true} />
                    <InputField label="Current Location" name="status" value={container.status} disabled={true} />
                    <div className="pt-6">
                        <button 
                            onClick={handleMarkAsLoaded} 
                            disabled={isSaving}
                            className="py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-lg disabled:bg-green-800"
                        >
                            {isSaving ? 'Updating...' : 'Mark as Loaded'}
                        </button>
                    </div>
                </div>
            );
        }
        
        if (container.status === 'ALL GOOD, BOOK FOR DELIVERY') {
            return (
                <form onSubmit={handleAssignDriver} className="p-4 space-y-4">
                    <InputField label="Container #" name="id" value={container.id} disabled={true} />
                    <div>
                        <label htmlFor="deliveryDriver" className="block text-sm font-medium text-gray-300 mb-1">Assign Delivery Truck/Driver *</label>
                        <select
                            id="deliveryDriver"
                            name="deliveryDriver"
                            value={selectedDriver}
                            onChange={(e) => setSelectedDriver(e.target.value)}
                            required
                            className="w-full p-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">-- Select Driver --</option>
                            {collections.drivers.map(d => <option key={d.docId} value={d.name}>{d.name} - {d.plate}</option>)}
                        </select>
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-lg">Cancel</button>
                        <button type="submit" disabled={isSaving} className="py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:bg-blue-800 disabled:cursor-not-allowed">
                            {isSaving ? 'Saving...' : 'Assign Driver'}
                        </button>
                    </div>
                </form>
            );
        }

        if (container.status.startsWith('Assigned to Driver')) {
            const driver = collections.drivers.find(d => d.name === container.deliveryDriver);
            return (
                <div className="p-6">
                    <div className="space-y-3 mb-6">
                        <h3 className="text-lg font-semibold text-center">{container.status}</h3>
                        <InputField label="Container #" value={container.id} disabled />
                        <InputField label="Booking #" value={container.booking} disabled />
                        {driver && (
                            <>
                                <InputField label="Driver ID" value={driver.id} disabled />
                                <InputField label="Plate" value={driver.plate} disabled />
                            </>
                        )}
                    </div>
                    <div className="flex justify-between items-center">
                         <div>
                            <button onClick={() => setDeleteConfirmOpen(true)} className="py-2 px-4 bg-red-800 hover:bg-red-700 rounded-lg text-sm">Delete</button>
                            <button onClick={handleUndo} disabled={events.length < 2 || isSaving} className="py-2 px-4 ml-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg text-sm disabled:bg-yellow-800 disabled:cursor-not-allowed">Undo</button>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => handlePierResponse(false)} disabled={isSaving} className="py-2 px-4 bg-red-600 hover:bg-red-500 rounded-lg">Denied</button>
                            <button onClick={() => handlePierResponse(true)} disabled={isSaving} className="py-2 px-4 bg-green-600 hover:bg-green-500 rounded-lg">Accepted</button>
                            <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-lg">Close</button>
                        </div>
                    </div>
                </div>
            );
        }

        // Default: Full edit form for other statuses
        return (
            <div className="flex flex-col lg:flex-row">
                <form onSubmit={handleSubmit} className="p-4 lg:w-1/2 space-y-4">
                    <InputField label="Container #" name="id" value={formData.id} disabled={true} />
                    <InputField label="Container Type" name="bookedFor" value={formData.bookedFor} disabled={true} />
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                        <select name="status" value={formData.status} onChange={handleChange} className="w-full p-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            {availableStatuses.map(s => <option key={s.label} value={s.label}>{s.emoji} {s.label}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Truck/Driver</label>
                        <select name="truck" value={formData.truck} onChange={handleChange} className="w-full p-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">-- Select Driver --</option>
                            {collections.drivers.map(d => <option key={d.docId} value={d.name}>{d.name} - {d.plate}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Chassis</label>
                        <select name="chassis" value={formData.chassis} onChange={handleChange} className="w-full p-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">-- Select Chassis --</option>
                            {collections.chassis.map(c => <option key={c.docId} value={c.id}>{c.id}</option>)}
                        </select>
                    </div>
                   
                    <InputField label="Seal #" name="seal" value={formData.seal} onChange={handleChange} />
                    
                    <InputField label="Gross Weight" name="grossWeight" type="number" value={formData.grossWeight} onChange={handleChange} />

                    <div className="flex flex-col gap-2 mt-2">
                        <CheckboxField label="Holes Before Squish" name="hasHolesBeforeSquish" checked={formData.hasHolesBeforeSquish} onChange={handleChange} />
                        <CheckboxField label="Holes After Squish" name="hasHolesAfterSquish" checked={formData.hasHolesAfterSquish} onChange={handleChange} />
                    </div>
                    <div className="pt-4 flex justify-between items-center gap-3">
                        <div>
                            <button
                                type="button"
                                onClick={() => setDeleteConfirmOpen(true)}
                                className="py-2 px-4 bg-red-600 hover:bg-red-700 rounded-lg text-sm"
                            >
                                Delete
                            </button>
                             <button
                                type="button"
                                onClick={handleUndo}
                                disabled={events.length < 2}
                                className="py-2 px-4 ml-2 bg-yellow-500 hover:bg-yellow-600 rounded-lg text-sm disabled:bg-yellow-800 disabled:cursor-not-allowed"
                            >
                                Undo Last Update
                            </button>
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-lg">Cancel</button>
                            <button type="submit" disabled={isSaving} className="py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:bg-blue-800 disabled:cursor-not-allowed">
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </form>
                <div className="p-4 lg:w-1/2 lg:border-l border-gray-700">
                    <h3 className="text-lg font-semibold mb-3">Event History</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {events.length > 0 ? (
                            events.map(event => (
                                <div key={event.id} className="bg-gray-700 p-3 rounded-md text-sm">
                                    <p className="font-bold text-gray-200">{event.details.action}</p>
                                    {event.details.changes && <p className="text-gray-400 text-xs mt-1">{event.details.changes}</p>}
                                    <p className="text-xs text-gray-500 text-right mt-1">{new Date(event.timestamp).toLocaleString()}</p>
                                </div>
                            ))
                        ) : (
                            <p className="text-gray-500">No events found for this container.</p>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <header className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold">{isNew ? 'Add New Container' : `Edit: ${container.id}`}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </header>
                
                <div className="flex-grow overflow-y-auto">
                    {renderContent()}
                </div>
                 {isDeleteConfirmOpen && (
                    <ConfirmationModal
                        message={`Are you sure you want to permanently delete container ${container.id}? This will also delete all of its event history.`}
                        onConfirm={handleDelete}
                        onCancel={() => setDeleteConfirmOpen(false)}
                    />
                )}
            </div>
        </div>
    );
};

// --- Standard UI Components ---

const InputField = ({ label, name, type = 'text', value, onChange, required = false, disabled = false }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-300 mb-1">{label} {required && '*'}</label>
        <input
            type={type}
            name={name}
            id={name}
            value={value}
            onChange={onChange}
            required={required}
            disabled={disabled}
            className="w-full p-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed"
        />
    </div>
);

const CheckboxField = ({ label, name, checked, onChange }) => (
    <label className="flex items-center space-x-2 cursor-pointer">
        <input
            type="checkbox"
            name={name}
            checked={checked}
            onChange={onChange}
            className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-300">{label}</span>
    </label>
);


// Modal for managing collections
const CollectionsModal = ({ onClose, paths, collectionsData }) => {
    const [activeTab, setActiveTab] = useState('drivers');

    const handleSave = async (collectionName, data, isNew) => {
        const path = paths[collectionName];
        const docRef = isNew ? doc(collection(db, path)) : doc(db, path, data.docId);
        const dataToSave = { ...data };
        delete dataToSave.docId; // Don't save the document ID in the document fields
        
        try {
            await setDoc(docRef, dataToSave, { merge: !isNew });
        } catch (error) {
            console.error(`Error saving to ${collectionName}:`, error);
        }
    };
    
    const handleDelete = async (collectionName, docId) => {
        try {
            await deleteDoc(doc(db, paths[collectionName], docId));
        } catch (error) {
            console.error(`Error deleting from ${collectionName}:`, error);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <header className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold">Manage Collections</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </header>
                <div className="border-b border-gray-700">
                    <nav className="flex space-x-4 p-4">
                        <TabButton name="drivers" activeTab={activeTab} setActiveTab={setActiveTab}>Drivers</TabButton>
                        <TabButton name="locations" activeTab={activeTab} setActiveTab={setActiveTab}>Locations</TabButton>
                        <TabButton name="chassis" activeTab={activeTab} setActiveTab={setActiveTab}>Chassis</TabButton>
                        <TabButton name="containerTypes" activeTab={activeTab} setActiveTab={setActiveTab}>Container Types</TabButton>
                    </nav>
                </div>
                <div className="p-4 overflow-y-auto">
                    {activeTab === 'drivers' && <CollectionManager collectionName="drivers" data={collectionsData.drivers} onSave={handleSave} onDelete={handleDelete} fields={{name: 'text', id: 'text', plate: 'text', weight: 'number'}} />}
                    {activeTab === 'locations' && <CollectionManager collectionName="locations" data={collectionsData.locations} onSave={handleSave} onDelete={handleDelete} fields={{location: 'text'}} />}
                    {activeTab === 'chassis' && <CollectionManager collectionName="chassis" data={collectionsData.chassis} onSave={handleSave} onDelete={handleDelete} fields={{id: 'text', weight: 'number', is2x20: 'boolean', is40ft: 'boolean'}} />}
                    {activeTab === 'containerTypes' && <CollectionManager collectionName="containerTypes" data={collectionsData.containerTypes} onSave={handleSave} onDelete={handleDelete} fields={{name: 'text'}} />}
                </div>
            </div>
        </div>
    );
};

const TabButton = ({ name, activeTab, setActiveTab, children }) => (
    <button
        onClick={() => setActiveTab(name)}
        className={`px-3 py-2 text-sm font-medium rounded-md ${
            activeTab === name
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-700'
        }`}
    >
        {children}
    </button>
);

const CollectionManager = ({ collectionName, data, onSave, onDelete, fields }) => {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [itemToDelete, setItemToDelete] = useState(null);

    const openForm = (item = null) => {
        const initial = Object.keys(fields).reduce((acc, key) => {
            acc[key] = fields[key] === 'boolean' ? false : fields[key] === 'number' ? 0 : '';
            return acc;
        }, {});
        setEditingItem(item || initial);
        setIsFormOpen(true);
    };

    const handleSave = (formData) => {
        onSave(collectionName, formData, !formData.docId);
        setIsFormOpen(false);
        setEditingItem(null);
    };

    const confirmDelete = () => {
        if (itemToDelete) {
            onDelete(collectionName, itemToDelete.docId);
            setItemToDelete(null);
        }
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold capitalize">{collectionName}</h3>
                <button onClick={() => openForm()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-sm">Add New</button>
            </div>
            {isFormOpen && <CollectionForm fields={fields} initialData={editingItem} onSave={handleSave} onCancel={() => setIsFormOpen(false)} />}
            
            <div className="space-y-2">
                {data.map(item => (
                    <div key={item.docId} className="bg-gray-700 p-3 rounded-md flex justify-between items-center">
                        <div className="text-sm">
                            {Object.entries(fields).map(([key]) => (
                               <p key={key}><span className="font-semibold capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span> {String(item[key])}</p>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => openForm(item)} className="text-yellow-400 hover:text-yellow-300 text-xs">Edit</button>
                            <button onClick={() => setItemToDelete(item)} className="text-red-500 hover:text-red-400 text-xs">Delete</button>
                        </div>
                    </div>
                ))}
            </div>

            {itemToDelete && (
                <ConfirmationModal
                    message={`Are you sure you want to delete this item?`}
                    onConfirm={confirmDelete}
                    onCancel={() => setItemToDelete(null)}
                />
            )}
        </div>
    );
};

const CollectionForm = ({ fields, initialData, onSave, onCancel }) => {
    const [formData, setFormData] = useState(initialData);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({...prev, [name]: type === 'checkbox' ? checked : value}));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="bg-gray-900 p-4 rounded-lg mb-4 space-y-3">
             {Object.entries(fields).map(([key, type]) => {
                if (type === 'boolean') {
                    return <CheckboxField key={key} label={key.replace(/([A-Z])/g, ' $1')} name={key} checked={!!formData[key]} onChange={handleChange} />;
                }
                return <InputField key={key} label={key.replace(/([A-Z])/g, ' $1')} name={key} type={type} value={formData[key] || ''} onChange={handleChange} />;
             })}
            <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onCancel} className="bg-gray-600 hover:bg-gray-500 py-1 px-3 rounded text-sm">Cancel</button>
                <button type="submit" className="bg-green-600 hover:bg-green-500 py-1 px-3 rounded text-sm">Save</button>
            </div>
        </form>
    );
};

const ConfirmationModal = ({ message, onConfirm, onCancel }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-sm">
                <p className="text-lg text-white mb-4">{message}</p>
                <div className="flex justify-end gap-4">
                    <button onClick={onCancel} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-lg">Cancel</button>
                    <button onClick={onConfirm} className="py-2 px-4 bg-red-600 hover:bg-red-700 rounded-lg">Confirm Delete</button>
                </div>
            </div>
        </div>
    );
};


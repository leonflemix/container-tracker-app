// File: src/App.js
// Location: src

import React, { useState, useMemo } from 'react';
// We no longer need data-fetching imports here
import { CONTAINER_STATUSES } from './constants';
import { TruckIcon, PlusIcon, DocumentPlusIcon, DatabaseIcon, ArchiveIcon, ChartIcon, FilterIcon, SortAscIcon, SortDescIcon, HomeIcon } from './icons';
import ContainerCard from './components/ContainerCard';
import GridContainerView from './components/GridContainerView';
import ReportsPage from './components/ReportsPage';
import Bookings from './components/Bookings'; // Import new Bookings page
import BookingModal from './components/BookingModal';
import ContainerModal from './components/ContainerModal';
import CollectionsModal from './components/CollectionsModal';
import { ToastProvider } from './hooks/useToasts';
import Dashboard from './components/Dashboard';
import { AppProvider, useAppContext } from './context/AppContext'; // Import context

// Main App Component Content
function AppContent() {
    // --- All data state is now in AppContext ---
    const {
        containers,
        archivedContainers,
        collections,
        loading,
        recentlyUpdated,
        
        // --- MODAL STATE AND HANDLERS FROM CONTEXT ---
        isModalOpen,
        openModal,
        closeModal,
        selectedContainer,
        selectedContainerId
        // ---
        
    } = useAppContext();
    
    // --- LOCAL UI STATE ---
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    const [isCollectionsModalOpen, setIsCollectionsModalOpen] = useState(false);
    const [preselectedBooking, setPreselectedBooking] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [pageView, setPageView] = useState('dashboard'); // 'dashboard', 'live', 'archive', 'reports', or 'bookings'
    const [view, setView] = useState(() => localStorage.getItem('containerTrackerView') || 'card');
    
    // State for sorting and filtering
    const [sortConfig, setSortConfig] = useState(() => {
        const savedSort = localStorage.getItem('containerTrackerSort');
        return savedSort ? JSON.parse(savedSort) : { key: 'createdAt', direction: 'ascending' };
    });
    const [filters, setFilters] = useState(() => {
        const savedFilters = localStorage.getItem('containerTrackerFilters');
        return savedFilters ? JSON.parse(savedFilters) : { status: '', bookedFor: '' };
    });
    const [showFilters, setShowFilters] = useState(false);

    // --- Save preferences to localStorage ---
    React.useEffect(() => {
        localStorage.setItem('containerTrackerView', view);
    }, [view]);

    React.useEffect(() => {
        localStorage.setItem('containerTrackerSort', JSON.stringify(sortConfig));
    }, [sortConfig]);

    React.useEffect(() => {
        localStorage.setItem('containerTrackerFilters', JSON.stringify(filters));
    }, [filters]);

    // --- Dynamically load external scripts ---
    React.useEffect(() => {
        const scriptId = 'tailwind-cdn';
        if (!document.getElementById(scriptId)) {
            const script = document.createElement('script');
            script.id = scriptId;
            script.src = 'https://cdn.tailwindcss.com';
            document.head.appendChild(script);
        }
    }, []);

    // --- Event Handlers ---
    
    // MODAL HANDLERS
    const handleOpenModal = (container = null) => {
        setPreselectedBooking(null); // Clear preselection for normal opens
        openModal(container ? container.id : null); // Just pass the ID to the context
    };

    const handleCloseModal = () => {
        closeModal();
        setPreselectedBooking(null); // Clear preselection on close
    };
    
    // This handler is for the Booking Modal
    const handleSelectBookingForContainerAdd = (bookingId) => {
        setPreselectedBooking(bookingId);
        setIsBookingModalOpen(false);
        // FIX: Call openModal directly instead of handleOpenModal
        // This prevents 'handleOpenModal' from clearing the preselectedBooking we just set.
        openModal(null); 
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
            return <Dashboard onOpen={handleContainerSelectFromDashboard} />;
        }
        if (pageView === 'reports') {
            return <ReportsPage />;
        }
        if (pageView === 'bookings') {
            return <Bookings />;
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
                                    {/* Data now from context */}
                                    {collections.containerTypes.map(t => <option key={t.docId} value={t.name}>{t.name}</option>)}
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
                                onSelect={handleOpenModal} // Use the simplified handler
                                isArchived={pageView === 'archive'}
                                containerTypes={collections.containerTypes}
                                recentlyUpdated={recentlyUpdated}
                            />
                        ))}
                    </div>
                ) : (
                    <GridContainerView 
                        containers={processedContainers}
                        collections={collections}
                        onEdit={handleOpenModal} // Use the simplified handler
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
            case 'bookings': return 'Bookings Management';
            default: return 'Container Tracker';
        }
    };

    // This logic prevents the modal from showing an "edit" screen
    // with "new" data (or vice-versa) during the re-render
    const canRenderModal = isModalOpen && (
        (selectedContainerId === null) || // We are creating a new container
        (selectedContainerId && selectedContainer) // We are editing and the container data has been loaded
    );

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
                            onClick={() => setPageView('bookings')}
                            className="flex items-center justify-center bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105 w-full sm:w-auto"
                        >
                            <DocumentPlusIcon />
                            Bookings
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
                        {/* We kept the Quick Add Booking button, but renamed/restyled or keep as 'Add Booking' if you want a shortcut */}
                        <button
                            onClick={() => setIsBookingModalOpen(true)}
                            className="flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105 w-full sm:w-auto"
                        >
                            <DocumentPlusIcon />
                            Quick Add Booking
                        </button>
                        <button
                            onClick={() => handleOpenModal(null)} // Simplified
                            className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-transform transform hover:scale-105 w-full sm:w-auto"
                        >
                            <PlusIcon />
                            Add Container
                        </button>
                    </div>
                </header>
                {renderMainContent()}
            </div>

            {/* --- MODAL RENDERING --- */}
            {/* The modal is only rendered when it's open AND the data is ready */}
            {/* The key prop is CRITICAL to force remount when the ID changes */}
            {canRenderModal && (
                <ContainerModal
                    key={selectedContainerId} 
                    onClose={handleCloseModal}
                    // All data is now passed from context,
                    // but we still pass these props
                    isArchived={pageView === 'archive'}
                    preselectedBooking={preselectedBooking}
                />
            )}
            
            {isBookingModalOpen && (
                <BookingModal
                    onClose={() => setIsBookingModalOpen(false)}
                    // No props needed, it will get data from context
                    onSelectBookingForContainerAdd={handleSelectBookingForContainerAdd}
                />
            )}
            
            {isCollectionsModalOpen && (
                <CollectionsModal
                    onClose={() => setIsCollectionsModalOpen(false)}
                    // No props needed, it will get data from context
                />
            )}
        </div>
    );
}

// Wrap AppContent with the provider
export default function App() {
    return (
        // The ToastProvider MUST wrap the AppProvider
        <ToastProvider>
            <AppProvider>
                <AppContent />
            </AppProvider>
        </ToastProvider>
    );
}
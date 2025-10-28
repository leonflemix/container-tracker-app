// File: src/App.js

import React, { useState } from 'react';
import { TruckIcon, PlusIcon, DocumentPlusIcon, DatabaseIcon, ArchiveIcon, ChartIcon, FilterIcon, SortAscIcon, SortDescIcon, HomeIcon } from './icons';
import ContainerCard from './components/ContainerCard';
import GridContainerView from './components/GridContainerView';
import ReportsPage from './components/ReportsPage';
import BookingModal from './components/BookingModal';
import ContainerModal from './components/ContainerModal';
import CollectionsModal from './components/CollectionsModal';
import { ToastProvider } from './hooks/useToasts';
import Dashboard from './components/Dashboard';
import { AppProvider, useAppContext } from './context/AppContext'; // Import AppProvider and hook
import { CONTAINER_STATUSES } from './constants'; // Re-import for filters

// Main App Component Content
function AppContent() {
    // --- All state is now managed by AppContext ---
    const {
        loading,
        containers,
        archivedContainers,
        collections: collectionsData, // alias
        pageView,
        setPageView,
        view,
        setView,
        sortConfig,
        requestSort,
        filters,
        handleFilterChange,
        showFilters,
        setShowFilters,
        searchTerm,
        setSearchTerm,
        processedContainers,
        recentlyUpdated,
        
        // Modal State & Handlers
        isModalOpen,
        isBookingModalOpen,
        setIsBookingModalOpen,
        isCollectionsModalOpen,
        setIsCollectionsModalOpen,
        handleOpenModal,
        handleCloseModal,
        handleSelectBookingForContainerAdd,
        selectedContainerId, // We need this for the <ContainerModal key />
        isModalReady, // Use this to control rendering
    } = useAppContext();

    // --- FIX: Add defensive check for collectionsData and containerTypes ---
    const containerTypes = collectionsData?.containerTypes || [];
    // ---

    const renderMainContent = () => {
        if (pageView === 'dashboard') {
            return <Dashboard onContainerSelect={handleOpenModal} />;
        }
        if (pageView === 'reports') {
            return <ReportsPage />;
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
                                    {/* --- FIX: Use the checked containerTypes variable --- */}
                                    {containerTypes.map(t => <option key={t.docId} value={t.name}>{t.name}</option>)}
                                    {/* --- */}
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
                                containerTypes={containerTypes} // Pass the safe variable
                                recentlyUpdated={recentlyUpdated}
                            />
                        ))}
                    </div>
                ) : (
                    <GridContainerView
                        containers={processedContainers}
                        collections={collectionsData} // Pass the whole object
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

            {/* Modal rendering is now controlled by isModalReady from context */}
            {isModalReady && (
                <ContainerModal
                    key={selectedContainerId || 'new'} // Use key to force remount
                    onClose={handleCloseModal}
                    isArchived={pageView === 'archive'}
                    // All other data is now provided by context
                />
            )}
            
            {isBookingModalOpen && (
                <BookingModal
                    onClose={() => setIsBookingModalOpen(false)}
                    onSelectBookingForContainerAdd={handleSelectBookingForContainerAdd}
                    // All other data is now provided by context
                />
            )}

            {isCollectionsModalOpen && (
                <CollectionsModal
                    onClose={() => setIsCollectionsModalOpen(false)}
                    // All other data is now provided by context
                />
            )}
        </div>
    );
}

// Wrap AppContent with the provider
export default function App() {
    return (
        <ToastProvider>
            <AppProvider> {/* AppProvider is now inside ToastProvider */}
                <AppContent />
            </AppProvider>
        </ToastProvider>
    );
}


// File: src/components/DriverPortal.jsx
import React, { useEffect } from 'react';
import DriverPage from './DriverPage';
import ContainerModal from './ContainerModal';
import { useAppContext } from '../context/AppContext';

export default function DriverPortal() {
    const { 
        isModalOpen, 
        closeModal, 
        selectedContainerId, 
        selectedContainer,
        preselectedBooking 
    } = useAppContext();

    // --- Dynamically load Tailwind (since we are outside Main AppContent) ---
    useEffect(() => {
        const scriptId = 'tailwind-cdn';
        if (!document.getElementById(scriptId)) {
            const script = document.createElement('script');
            script.id = scriptId;
            script.src = 'https://cdn.tailwindcss.com';
            document.head.appendChild(script);
        }
    }, []);

    // Logic to determine if we should render the modal
    const canRenderModal = isModalOpen && (
        (selectedContainerId === null) || 
        (selectedContainerId && selectedContainer)
    );

    return (
        <div className="bg-gray-900 text-gray-100 min-h-screen font-sans">
            {/* The Main Driver Content */}
            <DriverPage />

            {/* Helper Modals Needed for Driver Actions */}
            {canRenderModal && (
                <ContainerModal
                    key={selectedContainerId} 
                    onClose={closeModal}
                    isArchived={false} // Drivers deal with live data
                    preselectedBooking={preselectedBooking}
                />
            )}
        </div>
    );
}
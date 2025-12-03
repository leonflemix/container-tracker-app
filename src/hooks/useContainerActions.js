// File: src/hooks/useContainerActions.js
// Location: src/hooks

import { useState, useMemo, useRef } from 'react';
import useImageProcessing from './useImageProcessing';
import {
    createContainerWithBooking,
    updateContainerWithChanges,
    deleteContainerAndEvents,
    moveContainerToLocation,
    markContainerAsLoaded,
    assignDriverToContainer,
    undoLastUpdate,
    pierAcceptAndArchive,
    returnToTilter,
    markDeniedAwaitingUpdate,
    reviveContainer,
    markContainerAsRepaired,
    deleteCollectionAssignment // Added import
} from '../services/containerService';
import { CONTAINER_STATUSES } from '../constants';
import { useAppContext } from '../context/AppContext';

/**
 * Manages all state related to actions, and all action handlers for the container modal.
 * @param {object} props - { container, formData, setFormData, events, onClose, isArchived, isNew }
 */
export default function useContainerActions({
    container,
    formData,
    setFormData,
    events,
    onClose,
    isArchived,
    isNew
}) {
    // Get global data and actions from context
    const {
        containers,
        archivedContainers,
        openBookings,
        collections,
        paths,
        addToast,
        filledBookingCounts,
        pendingCollectionId // Get pending collection ID
    } = useAppContext();

    // Re-alias for clarity in service calls
    const allContainers = containers;
    const allArchivedContainers = archivedContainers;
    const { containersPath, eventsPath, archivePath, bookingsPath, archivedBookingsPath } = paths;
    const pickupsPath = bookingsPath ? bookingsPath.replace('bookings', 'pickups') : null;

    // --- Local state for modal actions ---
    const [isSaving, setIsSaving] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState('');
    const [selectedDriver, setSelectedDriver] = useState('');
    const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [denialStep, setDenialStep] = useState(null);
    const [isReviveConfirmOpen, setReviveConfirmOpen] = useState(false);
    const [isEditingCoreDetails, setIsEditingCoreDetails] = useState(false);

    // Refs for file inputs
    const uploadFileInputRef = useRef(null);
    const scanFileInputRef = useRef(null);

    // Image processing hook
    const { isProcessing: isImageProcessing, processFile } = useImageProcessing({ addToast });

    // --- Action Handlers ---

    const handleImageChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const parsed = await processFile(file);
        if (parsed) {
            setFormData(prev => ({
                ...prev,
                id: parsed.id || prev.id,
                tareWeight: parsed.tareWeight || prev.tareWeight
            }));
        }
        if (e.target) e.target.value = null; // Reset file input
    };

    const handleSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        const containerId = (isNew ? formData.id : container?.id);
        if (!containerId) { addToast("Container number is required.", 'error'); return; }

        if (isNew) {
            const allExistingContainers = [...allContainers, ...allArchivedContainers];
            const idExists = allExistingContainers.some(c => c.id.toUpperCase() === formData.id.toUpperCase());
            if (idExists) {
                addToast(`Container with ID ${formData.id.toUpperCase()} already exists.`, 'error');
                return;
            }
        }

        if (!formData.status) {
            addToast("Form data is not ready.", 'error');
            return;
        }

        if (formData.status === 'ALL GOOD, BOOK FOR DELIVERY') {
            if (!formData.truck || !formData.chassis || !formData.seal || !formData.grossWeight) {
                addToast("Please fill in Truck/Driver, Chassis, Seal #, and Gross Weight.", 'error');
                return;
            }
        }

        setIsSaving(true);
        try {
            if (isNew) {
                if (!formData.booking) { addToast("Please select a booking.", 'error'); setIsSaving(false); return; }
                await createContainerWithBooking({
                    containersPath,
                    eventsPath,
                    bookingsPath,
                    archivedBookingsPath,
                    formData,
                    openBookings,
                    filledBookingCounts
                });
                
                // --- CHECK FOR PENDING COLLECTION ---
                if (pendingCollectionId && pickupsPath) {
                    await deleteCollectionAssignment({ pickupsPath, pickupId: pendingCollectionId });
                    addToast(`Scheduled collection completed and removed from list.`, 'success');
                }

                addToast(`Container ${formData.id.toUpperCase()} added successfully!`, 'success');
            } else {
                const result = await updateContainerWithChanges({ containersPath, eventsPath, container, formData });
                if (result.updated) addToast(`Container ${container.id.toUpperCase()} updated successfully!`, 'success');
                else addToast(result.message || 'No changes detected.', 'info');
            }
            onClose();
        } catch (error) {
            console.error("Error saving container:", error);
            addToast(`Failed to save container: ${error.message}`, 'error');
        } finally { setIsSaving(false); }
    };

    const handleDelete = async () => {
        if (!container) return;
        setIsSaving(true);
        try {
            await deleteContainerAndEvents({ containersPath, eventsPath, containerId: container.id });
            addToast(`Container ${container.id} and its events were deleted.`, 'success');
            onClose();
        } catch (error) {
            console.error("Error deleting container and its events:", error);
            addToast("Failed to delete container.", 'error');
        } finally { setIsSaving(false); }
    };

    const handleLocationSubmit = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!container) return;
        if (!selectedLocation) { addToast("Please select a location.", 'error'); return; }
        setIsSaving(true);
        try {
            await moveContainerToLocation({ containersPath, eventsPath, containerId: container.id, selectedLocation, containerData: container });
            addToast(`Container moved to ${selectedLocation}.`, 'success');
            onClose();
        } catch (error) {
            console.error("Error updating location:", error);
            addToast("Failed to update location.", 'error');
        } finally { setIsSaving(false); }
    };

    const handleMarkAsLoaded = async () => {
        if (!container) return;
        setIsSaving(true);
        try {
            await markContainerAsLoaded({ containersPath, eventsPath, containerId: container.id, oldStatus: container.status, containerData: container });
            addToast('Container marked as loaded.', 'success');
            onClose();
        } catch (error) {
            console.error("Error marking as loaded:", error);
            addToast("Failed to mark as loaded.", 'error');
        } finally { setIsSaving(false); }
    };

    const handleAssignDriver = async (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!container) return;
        if (!selectedDriver) { addToast("Please select a driver to assign.", 'error'); return; }
        setIsSaving(true);
        try {
            await assignDriverToContainer({ containersPath, eventsPath, containerId: container.id, selectedDriver, containerData: container });
            addToast(`Container assigned to ${selectedDriver}.`, 'success');
            onClose();
        } catch (error) {
            console.error("Error assigning driver:", error);
            addToast("Failed to assign driver.", 'error');
        } finally { setIsSaving(false); }
    };

    const handleUndo = async () => {
        if (!container || events.length < 1) {
            addToast("Cannot undo. No previous state found.", 'error'); return;
        }
        const lastEvent = events[0];
        if (lastEvent.details.action.startsWith('Container created')) {
            addToast("Cannot undo the creation of a container. Please delete it instead.", 'error');
            return;
        }
        if (!lastEvent.details.previousData) {
            addToast("Cannot undo: This event is too old and lacks the required undo data.", 'error');
            return;
        }

        setIsSaving(true);
        try {
            await undoLastUpdate({
                containersPath,
                eventsPath,
                containerId: container.id,
                lastEventId: lastEvent.id,
                dataToRestore: lastEvent.details.previousData
            });
            addToast("Last update has been successfully undone.", 'success');
            onClose();
        } catch (error) {
            console.error("Error undoing last update:", error);
            addToast(`Failed to undo last update: ${error.message}`, 'error');
        } finally { setIsSaving(false); }
    };

    const handlePierResponse = async (isAccepted) => {
        if (!container) return;
        if (isAccepted) {
            setIsSaving(true);
            try {
                await pierAcceptAndArchive({ containersPath, eventsPath, archivePath, container });
                addToast('Container accepted by pier and archived.', 'success');
                onClose();
            } catch (error) {
                console.error(`Error accepting pier status:`, error);
                addToast("Failed to accept pier status.", 'error');
            } finally {
                setIsSaving(false);
            }
        } else {
            setDenialStep('choose');
        }
    };

    const handleReturnToTilter = async () => {
        if (!container) return;
        setIsSaving(true);
        try {
            await returnToTilter({ containersPath, eventsPath, containerId: container.id, containerData: container });
            addToast('Container status reset to New.', 'success');
            onClose();
        } catch (error) {
            console.error("Error returning container to tilter:", error);
            addToast("Failed to reset container status.", 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleNeedsUpdatesAfterDenial = async () => {
        if (!container) return;
        setIsSaving(true);
        try {
            await markDeniedAwaitingUpdate({ containersPath, eventsPath, containerId: container.id, containerData: container });
            addToast('Container marked as "Denied - Awaiting Update".', 'success');
            onClose();
        } catch (error) {
            console.error("Error setting container to awaiting update:", error);
            addToast("Failed to update container status.", 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleRevive = async () => {
        if (!container) return;
        setIsSaving(true);
        try {
            await reviveContainer({ containersPath, eventsPath, archivePath, container });
            addToast(`Container ${container.id} revived and is awaiting update.`, 'success');
            onClose();
        } catch (error) {
            console.error("Error reviving container:", error);
            addToast(`Failed to revive container: ${error.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleMarkAsRepaired = async () => {
        if (!container) return;
        setIsSaving(true);
        try {
            await markContainerAsRepaired({ 
                containersPath, 
                eventsPath, 
                containerId: container.id, 
                oldStatus: container.status,
                containerData: container
            });
            addToast('Container marked as repaired.', 'success');
            onClose();
        } catch (error) {
            console.error("Error marking as repaired:", error);
            addToast("Failed to mark as repaired.", 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const isAtLocation = useMemo(() => {
        if (!container?.status || !collections || !Array.isArray(collections.locations)) {
            return false;
        }
        return collections.locations.some(loc => loc.location === container.status);
    }, [container, collections]);

    const isInWorkshop = useMemo(() => {
        return container?.status === 'IN WORKSHOP';
    }, [container]);
    
    const availableStatuses = useMemo(() => {
        const statuses = CONTAINER_STATUSES.filter(s => s.isDispatchOption);
        const currentStatus = formData?.status;
        const isCurrentStatusInList = currentStatus && statuses.some(s => s.label === currentStatus);

        if (currentStatus && !isCurrentStatusInList) {
            const currentStatusInfo = CONTAINER_STATUSES.find(s => s.label === currentStatus) || { emoji: '📍', label: currentStatus };
            const statusToAdd = { emoji: '📍', label: currentStatus, isUpdateOption: true, isDispatchOption: true, ...currentStatusInfo };
            statuses.unshift(statusToAdd);
        }
        return statuses;
    }, [formData?.status]);


    return {
        // --- State & Setters ---
        isSaving,
        selectedLocation,
        setSelectedLocation,
        selectedDriver,
        setSelectedDriver,
        isDeleteConfirmOpen,
        setDeleteConfirmOpen,
        denialStep,
        setDenialStep,
        isReviveConfirmOpen,
        setReviveConfirmOpen,
        isEditingCoreDetails,
        setIsEditingCoreDetails,
        isImageProcessing,

        // --- Refs ---
        uploadFileInputRef,
        scanFileInputRef,

        // --- Derived State ---
        isAtLocation,
        isInWorkshop,
        availableStatuses,

        // --- Action Handlers ---
        handleImageChange,
        handleSubmit,
        handleDelete,
        handleLocationSubmit,
        handleMarkAsLoaded,
        handleAssignDriver,
        handleUndo,
        handlePierResponse,
        handleReturnToTilter,
        handleNeedsUpdatesAfterDenial,
        handleRevive,
        handleMarkAsRepaired
    };
}
import { useEffect, useMemo, useRef, useState } from 'react';
import { Timestamp } from '../firebase';
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
    reviveContainer
} from '../services/containerService';
import { CONTAINER_STATUSES } from '../constants';

export default function useContainerModal(props) {
    const {
        container,
        events = [],
        onClose,
        openBookings = [],
        collections = {},
        containersPath,
        eventsPath,
        archivePath,
        isArchived,
        addToast,
        bookingsPath,
        archivedBookingsPath,
        filledBookingCounts = {},
        allContainers = [],
        allArchivedContainers = [],
        preselectedBooking
    } = props;

    const isNew = !container;
    const [formData, setFormData] = useState(() => {
        if (isNew) return { id: '', tareWeight: 0, booking: preselectedBooking || '', status: 'New' };
        if (container) {
            return {
                id: container.id || '',
                status: container.status || 'New',
                truck: container.truck || '',
                deliveryDriver: container.deliveryDriver || '',
                grossWeight: container.grossWeight || 0,
                chassis: container.chassis || '',
                tareWeight: container.tareWeight || 0,
                seal: container.seal || '',
                booking: container.booking || '',
                bookedFor: container.bookedFor || '',
                hasHolesBeforeSquish: container.hasHolesBeforeSquish || false,
                hasHolesAfterSquish: container.hasHolesAfterSquish || false,
                createdAt: container.createdAt,
                lastUpdate: container.lastUpdate
            };
        }
        return {};
    });

    const [isSaving, setIsSaving] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState('');
    const [selectedDriver, setSelectedDriver] = useState('');
    const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [denialStep, setDenialStep] = useState(null);
    const [isReviveConfirmOpen, setReviveConfirmOpen] = useState(false);
    const [isEditingCoreDetails, setIsEditingCoreDetails] = useState(false);

    const uploadFileInputRef = useRef(null);
    const scanFileInputRef = useRef(null);

    useEffect(() => {
        if (!isNew && container) {
            if (!formData.id || formData.id !== container.id) {
                setFormData({
                    id: container.id || '',
                    status: container.status || 'New',
                    truck: container.truck || '',
                    deliveryDriver: container.deliveryDriver || '',
                    grossWeight: container.grossWeight || 0,
                    chassis: container.chassis || '',
                    tareWeight: container.tareWeight || 0,
                    seal: container.seal || '',
                    booking: container.booking || '',
                    bookedFor: container.bookedFor || '',
                    hasHolesBeforeSquish: container.hasHolesBeforeSquish || false,
                    hasHolesAfterSquish: container.hasHolesAfterSquish || false,
                    createdAt: container.createdAt,
                    lastUpdate: container.lastUpdate
                });
            }
        } else if (isNew) {
            if (preselectedBooking && formData.booking !== preselectedBooking) {
                setFormData(prev => ({ ...prev, booking: preselectedBooking }));
            }
            if (formData.status !== 'New') {
                setFormData(prev => ({ ...prev, status: 'New' }));
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [container, isNew, preselectedBooking]);

    const isAtLocation = useMemo(() => {
        if (!container?.status || !collections.locations) return false;
        return collections.locations.some(loc => loc.location === container.status);
    }, [container, collections.locations]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newFormData = { ...formData, [name]: type === 'checkbox' ? checked : value };

        if (name === 'booking') {
            const selectedBooking = openBookings.find(b => b.id === value);
            const originalBooking = [...openBookings, ...allArchivedContainers].find(b => b.id === value);
            if (selectedBooking) newFormData.bookedFor = selectedBooking.type || 'N/A';
            else if (originalBooking) newFormData.bookedFor = originalBooking.type || 'N/A';
            else newFormData.bookedFor = 'N/A';
        }

        setFormData(newFormData);
    };

    const { isProcessing: isImageProcessing, processFile } = useImageProcessing({ addToast });

    const handleImageChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const parsed = await processFile(file);
        if (parsed) {
            if (parsed.id) setFormData(prev => ({ ...prev, id: parsed.id }));
            if (parsed.tareWeight) setFormData(prev => ({ ...prev, tareWeight: parsed.tareWeight }));
        }
        if (e.target) e.target.value = null;
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
            console.error("Attempted to submit with missing status in formData", formData);
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
            await moveContainerToLocation({ containersPath, eventsPath, containerId: container.id, selectedLocation });
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
            await markContainerAsLoaded({ containersPath, eventsPath, containerId: container.id, oldStatus: container.status });
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
            await assignDriverToContainer({ containersPath, eventsPath, containerId: container.id, selectedDriver });
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
        if (lastEvent.details.action.startsWith('Container created') || !lastEvent.details.changes) {
            addToast("Cannot undo the creation of a container. Please delete it instead.", 'error');
            return;
        }
        setIsSaving(true);
        try {
            await undoLastUpdate({ containersPath, eventsPath, container, lastEvent });
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
            await returnToTilter({ containersPath, eventsPath, containerId: container.id });
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
            await markDeniedAwaitingUpdate({ containersPath, eventsPath, containerId: container.id });
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

    const selectedBookingType = useMemo(() => {
        if (isNew && formData.booking) return openBookings.find(b => b.id === formData.booking)?.type || null;
        if (!isNew && formData.booking) {
            const currentBooking = [...openBookings, ...allContainers, ...allArchivedContainers].find(b => b.id === formData.booking);
            return currentBooking?.type || container.bookedFor || 'N/A';
        }
        return container?.bookedFor || null;
    }, [formData.booking, openBookings, isNew, container, allContainers, allArchivedContainers]);

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
        // state
        isNew,
        isArchived,
        formData,
        setFormData,
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
        uploadFileInputRef,
        scanFileInputRef,
        isImageProcessing,

        // derived
        isAtLocation,
        selectedBookingType,
        availableStatuses,

        // data (pass-through)
        container,
        events,
        openBookings,
        collections,
        onClose,

        // handlers
        handleChange,
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
        handleRevive
    };
}
// ...existing code...
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Timestamp } from '../firebase';
import InputField from './InputField';
import CheckboxField from './CheckboxField';
import ConfirmationModal from './ConfirmationModal';
import { CONTAINER_STATUSES } from '../constants';
import { UndoIcon, PencilIcon } from '../icons';

import ImageUploadButtons from './ImageUploadButtons';
import EventHistory from './EventHistory';
import useImageProcessing from '../hooks/useImageProcessing';
import { safeToDate, calculateDaysBetween } from '../utils/dates';

import NewContainerForm from './NewContainerForm';
import EditContainerForm from './EditContainerForm';
import LocationMoveForm from './LocationMoveForm';
import AssignDriverForm from './AssignDriverForm';
import AssignedDriverPanel from './AssignedDriverPanel';
import ArchivedContainerView from './ArchivedContainerView';

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

// Main controller: keeps state + handlers, delegates UI to smaller components
export default function ContainerModal({
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
}) {
    const isNew = !container;
    const [formData, setFormData] = useState(() => {
        if (isNew) {
            return { id: '', tareWeight: 0, booking: preselectedBooking || '', status: 'New' };
        } else if (container) {
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
    }, [container, isNew, preselectedBooking, formData.id, formData.booking, formData.status]);

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

    // Use the image processing hook (handles Gemini call + OCR parse)
    const { isProcessing: isImageProcessing, processFile } = useImageProcessing({ addToast });

    const handleImageChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        // Delegate to hook
        const parsed = await processFile(file);
        if (parsed) {
            if (parsed.id) setFormData(prev => ({ ...prev, id: parsed.id }));
            if (parsed.tareWeight) setFormData(prev => ({ ...prev, tareWeight: parsed.tareWeight }));
        }
        // reset input value to allow re-uploading same image later
        if (e.target) e.target.value = null;
    };

    // --- Handlers now call service functions ---
    const handleSubmit = async (e) => {
        e.preventDefault();
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
        e.preventDefault();
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
        e.preventDefault();
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

    // Render: delegate UI to child components
    const renderContent = () => {
        if (!isNew && !formData.id) {
            if (container && !formData.id) return <div className="p-6 text-center text-gray-400">Loading container details...</div>;
            return <div className="p-6 text-center text-gray-400">Waiting for container data...</div>;
        }

        if (isArchived) {
            return <ArchivedContainerView
                container={container}
                events={events}
                isSaving={isSaving}
                onClose={onClose}
                setReviveConfirmOpen={() => setReviveConfirmOpen(true)}
                handleRevive={handleRevive}
            />;
        }

        if (isNew) {
            return <NewContainerForm
                formData={formData}
                handleChange={handleChange}
                handleImageChange={handleImageChange}
                handleSubmit={handleSubmit}
                openBookings={openBookings}
                selectedBookingType={selectedBookingType}
                isImageProcessing={isImageProcessing}
                isSaving={isSaving}
                onClose={onClose}
                scanFileInputRef={scanFileInputRef}
                uploadFileInputRef={uploadFileInputRef}
            />;
        }

        if (!container) return <div className="p-6 text-center text-gray-400">Error: Container data unavailable.</div>;

        if (container.status === 'New') {
            return <LocationMoveForm
                container={container}
                collections={collections}
                selectedLocation={selectedLocation}
                setSelectedLocation={setSelectedLocation}
                handleLocationSubmit={handleLocationSubmit}
                isSaving={isSaving}
                onClose={onClose}
            />;
        }

        if (isAtLocation) {
            return (
                <div className="p-4 flex flex-col items-center justify-center">
                    <InputField label="Container #" name="id" value={container.id} disabled={true} />
                    <InputField label="Current Location" name="status" value={container.status} disabled={true} />
                    <div className="pt-6">
                        <button onClick={handleMarkAsLoaded} disabled={isSaving} className="py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-lg disabled:bg-green-800">
                            {isSaving ? 'Updating...' : 'Mark as Loaded'}
                        </button>
                    </div>
                </div>
            );
        }

        if (container.status === 'ALL GOOD, BOOK FOR DELIVERY') {
            return <AssignDriverForm
                container={container}
                collections={collections}
                selectedDriver={selectedDriver}
                setSelectedDriver={setSelectedDriver}
                handleAssignDriver={handleAssignDriver}
                isSaving={isSaving}
                onClose={onClose}
            />;
        }

        if (container.status && container.status.startsWith('Assigned to Driver')) {
            return <AssignedDriverPanel
                container={container}
                collections={collections}
                events={events}
                denialStep={denialStep}
                setDenialStep={setDenialStep}
                isSaving={isSaving}
                setDeleteConfirmOpen={() => setDeleteConfirmOpen(true)}
                handleUndo={handleUndo}
                handlePierResponse={handlePierResponse}
                handleReturnToTilter={handleReturnToTilter}
                handleNeedsUpdatesAfterDenial={handleNeedsUpdatesAfterDenial}
                onClose={onClose}
            />;
        }

        // Default: edit form
        return (
            <div className="flex flex-col lg:flex-row">
                <EditContainerForm
                    formData={formData}
                    handleChange={handleChange}
                    isEditingCoreDetails={isEditingCoreDetails}
                    setIsEditingCoreDetails={setIsEditingCoreDetails}
                    availableStatuses={availableStatuses}
                    collections={collections}
                    openBookings={openBookings}
                    handleSubmit={handleSubmit}
                    onClose={onClose}
                    isSaving={isSaving}
                    setDeleteConfirmOpen={() => setDeleteConfirmOpen(true)}
                    handleUndo={handleUndo}
                />
                <div className="p-4 lg:w-1/2 lg:border-l border-gray-700">
                    <h3 className="text-lg font-semibold mb-3">Event History</h3>
                    <EventHistory events={events} />
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <header className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold">{isNew ? 'Add New Container' : `Edit: ${container?.id || '...'}`}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </header>
                <div className="flex-grow overflow-y-auto">
                    {(isNew || formData.id) ? renderContent() : <div className="p-6 text-center text-gray-400">Loading...</div>}
                </div>

                {isDeleteConfirmOpen && (
                    <ConfirmationModal
                        message={`Are you sure you want to permanently delete container ${container?.id}? This will also delete all of its event history.`}
                        onConfirm={handleDelete}
                        onCancel={() => setDeleteConfirmOpen(false)}
                    />
                )}
                {isReviveConfirmOpen && (
                    <ConfirmationModal
                        message={`Are you sure you want to revive container ${container?.id} and move it back to the live yard?`}
                        onConfirm={handleRevive}
                        onCancel={() => setReviveConfirmOpen(false)}
                        confirmText="Revive"
                        confirmBg="bg-green-600 hover:bg-green-700"
                    />
                )}
            </div>
        </div>
    );
}
// ...existing code...
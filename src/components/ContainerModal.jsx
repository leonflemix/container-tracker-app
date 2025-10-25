// File: src/components/ContainerModal.jsx
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { db, Timestamp } from '../firebase';
import {
    collection,
    doc,
    setDoc,
    addDoc,
    deleteDoc,
    query,
    where,
    getDocs,
    writeBatch
} from 'firebase/firestore';
import InputField from './InputField';
import CheckboxField from './CheckboxField';
import ConfirmationModal from './ConfirmationModal';
import { CONTAINER_STATUSES } from '../constants';
import { UndoIcon, PencilIcon } from '../icons';

import ImageUploadButtons from './ImageUploadButtons';
import EventHistory from './EventHistory';
import useImageProcessing from '../hooks/useImageProcessing';
import { safeToDate, calculateDaysBetween } from '../utils/dates';

// This file focuses on orchestration and delegates:
// - OCR + Gemini calls to useImageProcessing
// - Event history rendering to EventHistory
// - Image inputs/buttons to ImageUploadButtons

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

    // --- Save / update / handlers largely unchanged but kept here for context ---
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
        const containerRef = doc(db, containersPath, containerId.toUpperCase());
        const batch = writeBatch(db);

        try {
            if (isNew) {
                if (!formData.booking) { addToast("Please select a booking.", 'error'); setIsSaving(false); return; }
                const selectedBooking = openBookings.find(b => b.id === formData.booking);
                if (!selectedBooking) {
                    addToast("Selected booking is not valid or no longer open.", 'error');
                    setIsSaving(false);
                    return;
                }
                const dataToSave = {
                    id: formData.id.toUpperCase(),
                    seal: '',
                    booking: formData.booking,
                    bookedFor: selectedBooking?.type || 'N/A',
                    status: 'New',
                    createdAt: Timestamp.now(),
                    lastUpdate: Timestamp.now(),
                    truck: '',
                    deliveryDriver: '',
                    grossWeight: 0,
                    chassis: '',
                    tareWeight: formData.tareWeight || 0,
                    hasHolesBeforeSquish: false,
                    hasHolesAfterSquish: false,
                };
                const eventData = { containerId: formData.id.toUpperCase(), timestamp: Timestamp.now(), details: { action: `Container created with status: New for booking ${formData.booking}` } };
                batch.set(containerRef, dataToSave);
                batch.set(doc(collection(db, eventsPath)), eventData);
                addToast(`Container ${formData.id.toUpperCase()} added successfully!`, 'success');

                const currentFilledCount = filledBookingCounts[selectedBooking.id] || 0;
                if (currentFilledCount + 1 >= selectedBooking.quantity) {
                    const bookingToArchiveRef = doc(db, bookingsPath, selectedBooking.id);
                    const archivedBookingRef = doc(db, archivedBookingsPath, selectedBooking.id);
                    const archivedBookingData = { ...selectedBooking, archivedAt: Timestamp.now() };
                    batch.set(archivedBookingRef, archivedBookingData);
                    batch.delete(bookingToArchiveRef);
                    addToast(`Booking ${selectedBooking.id} is now full and has been archived.`, 'info');
                }
            } else {
                if (!container) {
                    addToast("Cannot save changes, container data is missing.", 'error');
                    setIsSaving(false);
                    return;
                }
                const changes = [];
                const dataToUpdate = { ...formData, lastUpdate: Timestamp.now() };
                if (container.createdAt) dataToUpdate.createdAt = container.createdAt;
                else dataToUpdate.createdAt = Timestamp.now();

                for (const key in dataToUpdate) {
                    if (Object.hasOwnProperty.call(dataToUpdate, key) && dataToUpdate[key] !== container[key]) {
                        if (!(container[key] instanceof Timestamp && dataToUpdate[key] instanceof Timestamp && container[key].isEqual(dataToUpdate[key]))) {
                            changes.push(`${key} changed from '${container[key] === undefined ? '' : container[key]}' to '${dataToUpdate[key]}'`);
                        }
                    }
                }

                delete dataToUpdate.id;

                if (changes.length > 0) {
                    batch.set(containerRef, dataToUpdate, { merge: true });
                    const eventData = { containerId: container.id.toUpperCase(), timestamp: Timestamp.now(), details: { action: 'Container updated', changes: changes.join('; ') } };
                    batch.set(doc(collection(db, eventsPath)), eventData);
                    addToast(`Container ${container.id.toUpperCase()} updated successfully!`, 'success');
                } else {
                    addToast('No changes detected.', 'info');
                }
            }
            await batch.commit();
            onClose();
        } catch (error) {
            console.error("Error saving container:", error);
            addToast(`Failed to save container: ${error.message}`, 'error');
        } finally { setIsSaving(false); }
    };

    const handleDelete = async () => {
        if (!container) return;
        try {
            await deleteDoc(doc(db, containersPath, container.id));
            const eventsQuery = query(collection(db, eventsPath), where("containerId", "==", container.id));
            const eventsSnapshot = await getDocs(eventsQuery);
            const batch = writeBatch(db);
            eventsSnapshot.docs.forEach(d => batch.delete(d.ref));
            await batch.commit();
            addToast(`Container ${container.id} and its events were deleted.`, 'success');
            onClose();
        } catch (error) {
            console.error("Error deleting container and its events:", error);
            addToast("Failed to delete container.", 'error');
        }
    };

    const handleLocationSubmit = async (e) => {
        e.preventDefault();
        if (!container) return;
        if (!selectedLocation) { addToast("Please select a location.", 'error'); return; }
        setIsSaving(true);
        const containerRef = doc(db, containersPath, container.id.toUpperCase());
        try {
            const dataToUpdate = { status: selectedLocation, lastUpdate: Timestamp.now() };
            await setDoc(containerRef, dataToUpdate, { merge: true });
            const eventData = { containerId: container.id.toUpperCase(), timestamp: Timestamp.now(), details: { action: 'Container moved to location', changes: `Status changed to '${selectedLocation}'` } };
            await addDoc(collection(db, eventsPath), eventData);
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
        const containerRef = doc(db, containersPath, container.id.toUpperCase());
        const newStatus = 'Loading Complete';
        try {
            const dataToUpdate = { status: newStatus, lastUpdate: Timestamp.now() };
            await setDoc(containerRef, dataToUpdate, { merge: true });
            const eventData = { containerId: container.id.toUpperCase(), timestamp: Timestamp.now(), details: { action: 'Container loaded', changes: `Status changed from '${container.status}' to '${newStatus}'` } };
            await addDoc(collection(db, eventsPath), eventData);
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
        const containerRef = doc(db, containersPath, container.id.toUpperCase());
        const newStatus = `Assigned to Driver - ${selectedDriver}`;
        try {
            const dataToUpdate = { status: newStatus, deliveryDriver: selectedDriver, lastUpdate: Timestamp.now() };
            await setDoc(containerRef, dataToUpdate, { merge: true });
            const eventData = { containerId: container.id.toUpperCase(), timestamp: Timestamp.now(), details: { action: 'Assigned to delivery driver', changes: `Assigned to ${selectedDriver}` } };
            await addDoc(collection(db, eventsPath), eventData);
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
            const containerRef = doc(db, containersPath, container.id);
            let stateToRestore = JSON.parse(JSON.stringify(container));
            const changesToRevert = lastEvent.details.changes.split('; ');
            changesToRevert.forEach(change => {
                const match = change.match(/(.+?) changed from '(.*?)' to '(.*?)'$/);
                if (match) {
                    const [, key, fromValueStr] = match;
                    const trimmedKey = key.trim();
                    if (Object.hasOwnProperty.call(stateToRestore, trimmedKey)) {
                        let originalValue;
                        const currentValue = container[trimmedKey];
                        if (typeof currentValue === 'boolean') {
                            originalValue = (fromValueStr === 'true');
                        } else if (typeof currentValue === 'number') {
                            originalValue = parseFloat(fromValueStr) || 0;
                        } else {
                            originalValue = fromValueStr;
                        }
                        stateToRestore[trimmedKey] = originalValue;
                    } else {
                        console.warn(`Key "${trimmedKey}" not found in current container state during undo.`);
                    }
                } else {
                    console.warn("Could not parse change detail for undo:", change);
                }
            });

            stateToRestore.lastUpdate = Timestamp.now();
            if (!(stateToRestore.createdAt instanceof Timestamp) && container.createdAt instanceof Timestamp) {
                stateToRestore.createdAt = container.createdAt;
            } else if (!stateToRestore.createdAt) {
                stateToRestore.createdAt = Timestamp.now();
            }

            for (const key in stateToRestore) {
                if (stateToRestore[key] instanceof Date) {
                    stateToRestore[key] = Timestamp.fromDate(stateToRestore[key]);
                }
            }

            delete stateToRestore.id;

            const batch = writeBatch(db);
            batch.set(containerRef, stateToRestore);
            batch.delete(doc(db, eventsPath, lastEvent.id));
            await batch.commit();
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
            const batch = writeBatch(db);
            const containerRef = doc(db, containersPath, container.id);
            try {
                const archiveRef = doc(db, archivePath, container.id);
                const now = Timestamp.now();
                const daysInYard = calculateDaysBetween(container.createdAt, now);
                const archivedData = { ...container, status: 'Pier Accepted', archivedAt: now, daysInYard };
                if (container.createdAt instanceof Timestamp || (container.createdAt && typeof container.createdAt.seconds === 'number')) {
                    archivedData.createdAt = container.createdAt;
                } else {
                    archivedData.createdAt = now;
                }
                batch.set(archiveRef, archivedData);
                batch.delete(containerRef);
                const eventData = { containerId: container.id.toUpperCase(), timestamp: now, details: { action: 'Pier Accepted & Archived' } };
                batch.set(doc(collection(db, eventsPath)), eventData);
                await batch.commit();
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
        const containerRef = doc(db, containersPath, container.id);
        const newStatus = 'New';
        try {
            const dataToUpdate = { status: newStatus, lastUpdate: Timestamp.now() };
            await setDoc(containerRef, dataToUpdate, { merge: true });
            const eventData = { containerId: container.id.toUpperCase(), timestamp: Timestamp.now(), details: { action: 'Pier Denied - Returned to Tilter/Location' } };
            await addDoc(collection(db, eventsPath), eventData);
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
        const containerRef = doc(db, containersPath, container.id);
        const newStatus = 'Denied - Awaiting Update';
        try {
            const dataToUpdate = { status: newStatus, lastUpdate: Timestamp.now() };
            await setDoc(containerRef, dataToUpdate, { merge: true });
            const eventData = { containerId: container.id.toUpperCase(), timestamp: Timestamp.now(), details: { action: 'Pier Denied - Awaiting Further Updates' } };
            await addDoc(collection(db, eventsPath), eventData);
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
        const batch = writeBatch(db);
        const liveRef = doc(db, containersPath, container.id);
        const archiveRef = doc(db, archivePath, container.id);
        const revivedData = { ...container, status: 'Revived - Awaiting Update', lastUpdate: Timestamp.now() };
        delete revivedData.archivedAt;
        delete revivedData.daysInYard;
        if (!(revivedData.createdAt instanceof Timestamp) && typeof revivedData.createdAt?.seconds === 'number') {
            revivedData.createdAt = Timestamp.fromMillis(revivedData.createdAt.seconds * 1000);
        } else if (!(revivedData.createdAt instanceof Timestamp)) {
            revivedData.createdAt = Timestamp.now();
        }

        try {
            batch.set(liveRef, revivedData);
            batch.delete(archiveRef);
            const eventData = { containerId: container.id, timestamp: Timestamp.now(), details: { action: 'Container Revived - Awaiting Update' } };
            batch.set(doc(collection(db, eventsPath)), eventData);

            await batch.commit();
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

    // Render content (keeps the same branching logic but uses the new small components)
    const renderContent = () => {
        if (!isNew && !formData.id) {
            if (container && !formData.id) return <div className="p-6 text-center text-gray-400">Loading container details...</div>;
            return <div className="p-6 text-center text-gray-400">Waiting for container data...</div>;
        }

        if (isArchived) {
            if (!container) return <div className="p-6 text-center text-gray-400">Loading archived details...</div>;
            return (
                <div className="flex flex-col lg:flex-row">
                    <div className="p-4 lg:w-1/2 space-y-3">
                        <h3 className="text-lg font-semibold text-center mb-4">Archived Container Details</h3>
                        {Object.entries(container).map(([key, value]) => {
                            if (typeof value !== 'object' || value === null || value?.toDate) {
                                let displayValue = String(value);
                                const dateValue = safeToDate(value);
                                if (dateValue) displayValue = dateValue.toLocaleString();
                                return <InputField key={key} label={key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')} value={displayValue} disabled />;
                            }
                            return null;
                        })}
                        <div className="pt-4 flex justify-between items-center gap-3">
                            <button onClick={() => setReviveConfirmOpen(true)} disabled={isSaving} className="flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md">
                                <UndoIcon />
                                Revive Container
                            </button>
                            <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-lg">Close</button>
                        </div>
                    </div>
                    <div className="p-4 lg:w-1/2 lg:border-l border-gray-700">
                        <h3 className="text-lg font-semibold mb-3">Event History</h3>
                        <EventHistory events={events} />
                    </div>
                </div>
            );
        }

        if (isNew) {
            return (
                <>
                    <form onSubmit={handleSubmit} className="p-4 space-y-4">
                        <ImageUploadButtons
                            scanInputRef={scanFileInputRef}
                            uploadInputRef={uploadFileInputRef}
                            onFileChange={handleImageChange}
                            disabled={isImageProcessing || isSaving}
                        />
                        <div className="flex justify-between items-end gap-4">
                            <div className="flex-grow">
                                <label className="block text-sm font-medium text-gray-300 mb-1">Booking # *</label>
                                <select name="booking" value={formData.booking || ''} onChange={handleChange} className="w-full p-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="">-- Select an Open Booking --</option>
                                    {openBookings.map(b => <option key={b.id} value={b.id}>{b.id} ({b.type})</option>)}
                                </select>
                            </div>
                        </div>

                        {selectedBookingType && <p className="text-sm text-gray-400">Selected Type: <span className="font-semibold text-gray-200">{selectedBookingType}</span></p>}
                        <InputField label="Container #" name="id" value={formData.id || ''} onChange={handleChange} required />
                        <InputField label="Tare Weight" name="tareWeight" type="number" value={formData.tareWeight || 0} onChange={handleChange} />
                        <div className="pt-4 flex justify-end gap-3">
                            <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-lg">Cancel</button>
                            <button type="submit" disabled={isSaving} className="py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:bg-blue-800 disabled:cursor-not-allowed">
                                {isSaving ? 'Saving...' : 'Add Container'}
                            </button>
                        </div>
                    </form>
                </>
            );
        }

        // existing container branches (trimmed here but unchanged from original behaviour)
        if (!container) return <div className="p-6 text-center text-gray-400">Error: Container data unavailable.</div>;

        if (container.status === 'New') {
            return (
                <form onSubmit={handleLocationSubmit} className="p-4 space-y-4">
                    <InputField label="Container #" name="id" value={container.id} disabled={true} />
                    <div>
                        <label htmlFor="location" className="block text-sm font-medium text-gray-300 mb-1">Move to Location *</label>
                        <select id="location" name="location" value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)} required className="w-full p-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">-- Select a Location --</option>
                            {collections.locations.map(loc => <option key={loc.docId} value={loc.location}>{loc.location}</option>)}
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
                        <button onClick={handleMarkAsLoaded} disabled={isSaving} className="py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-lg disabled:bg-green-800">
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
                        <select id="deliveryDriver" name="deliveryDriver" value={selectedDriver} onChange={(e) => setSelectedDriver(e.target.value)} required className="w-full p-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
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

        if (container.status && container.status.startsWith('Assigned to Driver')) {
            const driver = collections.drivers.find(d => d.name === container.deliveryDriver);

            if (denialStep === 'choose') {
                return (
                    <div className="p-6 text-center">
                        <h3 className="text-lg font-semibold mb-4">What is the next step for this denied container?</h3>
                        <div className="flex justify-center gap-4">
                            <button onClick={handleReturnToTilter} disabled={isSaving} className="py-2 px-4 bg-orange-600 hover:bg-orange-500 rounded-lg">Return to Tilter/Location</button>
                            <button onClick={handleNeedsUpdatesAfterDenial} disabled={isSaving} className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 rounded-lg">Needs Manual Update</button>
                        </div>
                    </div>
                );
            }

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

        // Default: edit form
        return (
            <div className="flex flex-col lg:flex-row">
                <form onSubmit={handleSubmit} className="p-4 lg:w-1/2 space-y-4">
                    <InputField label="Container #" name="id" value={formData.id || ''} disabled={true} />
                    <InputField label="Tare Weight" name="tareWeight" type="number" value={formData.tareWeight || 0} onChange={handleChange} disabled={!isEditingCoreDetails} className={isEditingCoreDetails ? "ring-2 ring-yellow-500" : ""} />
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Booking #</label>
                        <select name="booking" value={formData.booking || ''} onChange={handleChange} className={`w-full p-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed ${isEditingCoreDetails ? "ring-2 ring-yellow-500" : ""}`} disabled={!isEditingCoreDetails}>
                            <option value={container.booking}>{container.booking} (Current)</option>
                            {openBookings.map(b => (b.id !== container.booking && <option key={b.id} value={b.id}>{b.id} ({b.type})</option>))}
                        </select>
                    </div>

                    <InputField label="Container Type" name="bookedFor" value={formData.bookedFor || ''} disabled={true} />

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
                        <select name="status" value={formData.status || ''} onChange={handleChange} className="w-full p-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            {availableStatuses.map(s => <option key={s.label} value={s.label}>{s.emoji} {s.label}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Truck/Driver</label>
                        <select name="truck" value={formData.truck || ''} onChange={handleChange} className="w-full p-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">-- Select Driver --</option>
                            {collections.drivers.map(d => <option key={d.docId} value={d.name}>{d.name} - {d.plate}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Chassis</label>
                        <select name="chassis" value={formData.chassis || ''} onChange={handleChange} className="w-full p-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">-- Select Chassis --</option>
                            {collections.chassis.map(c => <option key={c.docId} value={c.id}>{c.id}</option>)}
                        </select>
                    </div>

                    <InputField label="Seal #" name="seal" value={formData.seal || ''} onChange={handleChange} />
                    <InputField label="Gross Weight" name="grossWeight" type="number" value={formData.grossWeight || 0} onChange={handleChange} />

                    <div className="flex flex-col gap-2 mt-2">
                        <CheckboxField label="Holes Before Squish" name="hasHolesBeforeSquish" checked={!!formData.hasHolesBeforeSquish} onChange={handleChange} />
                        <CheckboxField label="Holes After Squish" name="hasHolesAfterSquish" checked={!!formData.hasHolesAfterSquish} onChange={handleChange} />
                    </div>
                    <div className="pt-4 flex justify-between items-center gap-3">
                        <div>
                            <button type="button" onClick={() => setDeleteConfirmOpen(true)} className="py-2 px-4 bg-red-600 hover:bg-red-700 rounded-lg text-sm">Delete</button>
                            <button type="button" onClick={handleUndo} disabled={events.length < 2 || isSaving} className="py-2 px-4 ml-2 bg-yellow-500 hover:bg-yellow-600 rounded-lg text-sm disabled:bg-yellow-800 disabled:cursor-not-allowed">Undo Last Update</button>
                            {!isEditingCoreDetails && (
                                <button type="button" onClick={() => setIsEditingCoreDetails(true)} title="Edit Core Details" className="flex items-center py-2 px-4 ml-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg text-sm">
                                    <PencilIcon /> Edit Core
                                </button>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-lg">Cancel</button>
                            <button type="submit" disabled={isSaving} className="py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:bg-blue-800 disabled:cursor-not-allowed">{isSaving ? 'Saving...' : 'Save Changes'}</button>
                        </div>
                    </div>
                </form>
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


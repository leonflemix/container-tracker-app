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
import CameraScanner from './CameraScanner';
import { CONTAINER_STATUSES } from '../constants';
import { UndoIcon, CameraIcon, UploadIcon } from '../icons';

// Helper function to safely convert potential Timestamps to Date objects
const safeToDate = (timestamp) => {
    if (timestamp instanceof Timestamp) {
        return timestamp.toDate();
    }
    // Attempt to handle cases where it might already be a Date or number (seconds)
    if (timestamp instanceof Date) {
        return timestamp;
    }
     if (timestamp && typeof timestamp.seconds === 'number') {
        return new Date(timestamp.seconds * 1000);
    }
    return null; // Return null if conversion is not possible
};

// Helper function to calculate days between two dates (Date objects or Timestamps)
const calculateDaysBetween = (start, end) => {
    const startDate = safeToDate(start);
    const endDate = safeToDate(end);
    if (!startDate || !endDate) return 0; // Or handle as error/unknown
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.max(0, Math.floor((endDate - startDate) / oneDay)); // Ensure non-negative
};


export default function ContainerModal({
    container,
    events,
    onClose,
    openBookings,
    collections,
    containersPath,
    eventsPath,
    archivePath,
    isArchived,
    addToast,
    bookingsPath,
    archivedBookingsPath,
    filledBookingCounts,
    allContainers,
    allArchivedContainers,
    preselectedBooking
}) {
    const isNew = !container;
    // Initialize formData directly based on props using the useState initializer function
    const [formData, setFormData] = useState(() => {
        if (isNew) {
            return {
                id: '',
                tareWeight: 0,
                booking: preselectedBooking || '',
                status: 'New' // Ensure 'New' status is set initially
            };
        } else if (container) { // Ensure container exists on initial render
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
                // Store timestamps directly if they exist, otherwise null/undefined is fine here
                createdAt: container.createdAt,
                lastUpdate: container.lastUpdate
            };
        }
        return {}; // Default empty
    });

    const [isSaving, setIsSaving] = useState(false);
    const [selectedLocation, setSelectedLocation] = useState('');
    const [selectedDriver, setSelectedDriver] = useState('');
    const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [denialStep, setDenialStep] = useState(null);
    const [isReviveConfirmOpen, setReviveConfirmOpen] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const uploadFileInputRef = useRef(null); // Separate ref for upload
    const scanFileInputRef = useRef(null);   // Separate ref for camera scan

    // Effect to re-synchronize formData IF the container prop actually changes ID
    // or if the initial container prop was null/undefined and then populated.
     useEffect(() => {
        if (!isNew && container) {
            // Update formData only if the container ID is different from the current formData ID
             if (!formData.id || formData.id !== container.id) {
                console.log("Syncing formData with new container prop:", container.id); // Debug log
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
                    // Store timestamps directly
                    createdAt: container.createdAt,
                    lastUpdate: container.lastUpdate
                });
            }
        } else if (isNew) {
             // Ensure preselectedBooking is set if provided and different
             if(preselectedBooking && formData.booking !== preselectedBooking) {
                 setFormData(prev => ({ ...prev, booking: preselectedBooking }));
             }
             // Ensure status is 'New' if formData somehow lost it (less likely now)
             if (formData.status !== 'New') {
                 setFormData(prev => ({...prev, status: 'New'}));
             }
        }
    }, [container, isNew, preselectedBooking, formData.id, formData.booking, formData.status]); // Add formData.status


    const isAtLocation = useMemo(() => {
         // Use optional chaining for safety
        if (!container?.status || !collections.locations) return false;
        return collections.locations.some(loc => loc.location === container.status);
    }, [container, collections.locations]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

     const fileToBase64 = (file) =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = (error) => reject(error);
        });

    const processOcrText = (text) => {
        console.log("Scanned Text:", text);

        // More robust Regex for container number (handles spaces and newlines between parts, includes check digit)
        const containerIdMatch = text.match(/([A-Z]{4})\s*(\d{6})\s*(\d)/);
        // More robust Regex for TARE weight, looking for numbers before KGS (allows for comma or period)
        const tareMatch = text.match(/TARE[\s\S]*?(\d{1,3}[.,]?\d{3})\s*KGS/i);

        let foundId = false;
        if (containerIdMatch && containerIdMatch[1] && containerIdMatch[2] && containerIdMatch[3]) {
            const id = `${containerIdMatch[1]}${containerIdMatch[2]}${containerIdMatch[3]}`; // Combine parts including check digit
            setFormData(prev => ({ ...prev, id }));
            addToast(`Found Container ID: ${id}`, 'success');
            foundId = true;
        } else {
            addToast('Could not find a valid Container ID (Format: XXXU1234567).', 'error');
        }

        let foundTare = false;
        if (tareMatch && tareMatch[1]) {
            const tareWeight = parseInt(tareMatch[1].replace(/[.,]/g, ''), 10); // Remove comma or period
            setFormData(prev => ({ ...prev, tareWeight }));
            addToast(`Found Tare Weight: ${tareWeight} KGS`, 'success');
            foundTare = true;
        } else {
            addToast('Could not find Tare Weight in KGS.', 'error');
        }
    };

    const handleScanComplete = (text) => {
        setIsScannerOpen(false);
        processOcrText(text);
    };

    const handleImageProcess = async (event) => { // Renamed from handle
        const file = event.target.files[0];
        if (!file) return;

        setIsSaving(true); // Indicate processing
        addToast("Processing image with Gemini...", "info");

        try {
            const base64ImageData = await fileToBase64(file);
            const apiKey = ""; // API key is handled by the environment
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

            const payload = {
                contents: [
                    {
                        parts: [
                            { text: "Extract all visible text from the image of the container door. Preserve the original line breaks." },
                            {
                                inlineData: {
                                    mimeType: file.type,
                                    data: base64ImageData,
                                },
                            },
                        ],
                    },
                ],
            };

            // Implement basic retry logic
            let response;
            for (let i = 0; i < 3; i++) {
                try {
                    response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                    });
                    if (response.ok) break; // Exit loop if successful
                    if (response.status === 429 || response.status >= 500) { // Retry on rate limit or server error
                        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i))); // Exponential backoff
                        console.log(`Retrying API call (${i + 1})...`);
                        continue;
                    }
                    // Don't retry for other client errors (e.g., 400 Bad Request)
                    break;
                } catch (networkError) {
                    console.error("Network error during fetch:", networkError);
                    if (i === 2) throw networkError; // Throw after last retry
                    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
                }
            }


            if (!response || !response.ok) { // Check if response exists before accessing ok
                const errorBody = response ? await response.json().catch(() => ({ error: { message: response.statusText } })) : { error: { message: "Network error or no response"} }; // Graceful error parsing
                throw new Error(`API Error: ${errorBody.error?.message || response?.statusText || "Unknown fetch error"}`);
            }

            const result = await response.json();
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

            if (text) {
                processOcrText(text.trim());
            } else {
                // Check for safety ratings or blocked content
                const safetyReason = result.candidates?.[0]?.finishReason;
                if (safetyReason && safetyReason !== "STOP") {
                     throw new Error(`Content generation stopped due to safety reasons: ${safetyReason}`);
                } else if (result.promptFeedback?.blockReason) {
                     throw new Error(`Prompt blocked due to safety reasons: ${result.promptFeedback.blockReason}`);
                } else {
                    throw new Error("Could not extract text. The image might be unclear or empty.");
                }
            }
        } catch (err) {
            addToast(err.message || "An unexpected error occurred during image processing.", "error");
            console.error(err);
        } finally {
            setIsSaving(false);
            // Reset file input value so the same file can be selected again if needed
            if (event.target) {
                 event.target.value = null;
            }
        }
    };


    const handleSubmit = async (e) => {
        e.preventDefault();
        const containerId = (isNew ? formData.id : container?.id); // Use optional chaining for container
        if (!containerId) { addToast("Container number is required.", 'error'); return; }

        if (isNew) {
            const allExistingContainers = [...allContainers, ...allArchivedContainers];
            const idExists = allExistingContainers.some(c => c.id.toUpperCase() === formData.id.toUpperCase());
            if (idExists) {
                addToast(`Container with ID ${formData.id.toUpperCase()} already exists.`, 'error');
                return;
            }
        }

        // Ensure formData is populated before checking specific fields, especially for new containers
        if (!formData.status) {
             addToast("Form data is not ready.", 'error');
             console.error("Attempted to submit with missing status in formData", formData);
             return; // Prevent submission if formData isn't loaded correctly
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
                if (!selectedBooking) { // Add check for valid booking selection
                    addToast("Selected booking is not valid or no longer open.", 'error');
                    setIsSaving(false);
                    return;
                }
                const dataToSave = {
                    id: formData.id.toUpperCase(),
                    seal: '',
                    booking: formData.booking,
                    bookedFor: selectedBooking?.type || 'N/A',
                    status: 'New', // Status is correctly set here
                    createdAt: Timestamp.now(), // Use Firestore Timestamp for new containers
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
                 if (!container) { // Add safety check for edit mode
                     addToast("Cannot save changes, container data is missing.", 'error');
                     setIsSaving(false);
                     return;
                 }
                const changes = [];
                 // Prepare data for update, ensuring timestamps are preserved or updated correctly
                const dataToUpdate = { ...formData, lastUpdate: Timestamp.now() };
                // Explicitly keep the original createdAt timestamp if it exists
                if (container.createdAt) {
                    dataToUpdate.createdAt = container.createdAt;
                } else {
                    // Fallback if somehow createdAt was missing (shouldn't happen for existing)
                    dataToUpdate.createdAt = Timestamp.now();
                    console.warn("Original createdAt missing, setting to now for container:", container.id);
                }


                for (const key in dataToUpdate) {
                     // Check changes against the original container prop
                     if (Object.hasOwnProperty.call(dataToUpdate, key) && dataToUpdate[key] !== container[key]) {
                        // Skip comparing timestamp objects directly if they are both timestamps
                        if (!(container[key] instanceof Timestamp && dataToUpdate[key] instanceof Timestamp && container[key].isEqual(dataToUpdate[key]))) {
                             changes.push(`${key} changed from '${container[key] === undefined ? '' : container[key]}' to '${dataToUpdate[key]}'`);
                         }
                    }
                }

                 // Remove id from the update payload
                delete dataToUpdate.id;

                if (changes.length > 0) {
                    batch.set(containerRef, dataToUpdate, { merge: true }); // Use merge: true
                    const eventData = { containerId: container.id.toUpperCase(), timestamp: Timestamp.now(), details: { action: 'Container updated', changes: changes.join('; ') } };
                    batch.set(doc(collection(db, eventsPath)), eventData);
                    addToast(`Container ${container.id.toUpperCase()} updated successfully!`, 'success');
                } else {
                     addToast('No changes detected.', 'info'); // Inform user if no changes were made
                }
            }
            await batch.commit();
            onClose();
        } catch (error) {
            console.error("Error saving container:", error);
            addToast(`Failed to save container: ${error.message}`, 'error'); // Show more specific error
        } finally { setIsSaving(false); }
    };

    // ... (rest of handlers remain unchanged, ensure they also check if 'container' exists before using it) ...
    const handleDelete = async () => {
        if (!container) return; // Add check
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
        if (!container) return; // Add check
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
         if (!container) return; // Add check
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
         if (!container) return; // Add check
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
         if (!container || events.length < 1) { // Add check for container
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
            // Start with a deep copy of the current container state from the prop
            // This preserves existing Timestamps
            let stateToRestore = JSON.parse(JSON.stringify(container));

            const changesToRevert = lastEvent.details.changes.split('; ');

            changesToRevert.forEach(change => {
                const match = change.match(/(.+?) changed from '(.*?)' to '(.*?)'$/); // Use non-greedy match
                if (match) {
                    const [, key, fromValueStr] = match;
                    const trimmedKey = key.trim(); // Trim key just in case

                    if (Object.hasOwnProperty.call(stateToRestore, trimmedKey)) {
                         // Attempt to parse the 'fromValueStr' back to its likely original type
                         let originalValue;
                         const currentValue = container[trimmedKey]; // Compare type with current value

                         if (typeof currentValue === 'boolean') {
                             originalValue = (fromValueStr === 'true');
                         } else if (typeof currentValue === 'number') {
                             originalValue = parseFloat(fromValueStr) || 0;
                         } else if (currentValue instanceof Timestamp || trimmedKey === 'createdAt' || trimmedKey === 'lastUpdate' || trimmedKey === 'archivedAt') {
                             // If the original value was likely a Timestamp, try to parse it back.
                             // This is tricky as the string format isn't guaranteed.
                             // A safer approach might be needed if Timestamps are frequently reverted.
                             // For now, we'll keep the timestamp from the *current* state if revert fails.
                             console.warn(`Attempting to revert potential Timestamp field '${trimmedKey}'. String value: '${fromValueStr}'. Reverting may not restore exact time.`);
                             originalValue = currentValue; // Fallback: keep current timestamp
                         }
                         else {
                              originalValue = fromValueStr; // Default to string
                         }
                         stateToRestore[trimmedKey] = originalValue;
                    } else {
                         console.warn(`Key "${trimmedKey}" not found in current container state during undo.`);
                    }
                } else {
                    console.warn("Could not parse change detail for undo:", change);
                }
            });

            // Ensure critical timestamps are valid Firestore Timestamps
             stateToRestore.lastUpdate = Timestamp.now(); // Always set lastUpdate to now
             // Ensure createdAt is still a valid Timestamp (it should be from the deep copy)
             if (!(stateToRestore.createdAt instanceof Timestamp) && container.createdAt instanceof Timestamp) {
                  console.warn("createdAt was lost during undo, restoring from original prop.");
                  stateToRestore.createdAt = container.createdAt;
             } else if (!stateToRestore.createdAt) {
                 // If createdAt somehow became null/undefined, this is an error state.
                 // Setting to now() might be incorrect, but prevents Firestore error.
                 console.error("createdAt field is missing or invalid during undo. Setting to current time as fallback.");
                 stateToRestore.createdAt = Timestamp.now();
             }

             // Convert JS Dates back to Timestamps if any exist (less likely with deep copy)
             for (const key in stateToRestore) {
                 if (stateToRestore[key] instanceof Date) {
                     stateToRestore[key] = Timestamp.fromDate(stateToRestore[key]);
                 }
             }

            // Remove id if it exists (shouldn't be set directly)
            delete stateToRestore.id;

            const batch = writeBatch(db);
            batch.set(containerRef, stateToRestore); // Use set (overwrite) for undo
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
         if (!container) return; // Add check
        if (isAccepted) {
            setIsSaving(true);
            const batch = writeBatch(db);
            const containerRef = doc(db, containersPath, container.id);
            try {
                const archiveRef = doc(db, archivePath, container.id);
                const now = Timestamp.now();
                // Safely calculate daysInYard
                const daysInYard = calculateDaysBetween(container.createdAt, now);

                const archivedData = { ...container, status: 'Pier Accepted', archivedAt: now, daysInYard };
                // Ensure createdAt is carried over correctly
                if (container.createdAt instanceof Timestamp || (container.createdAt && typeof container.createdAt.seconds === 'number')) { // More robust check
                    archivedData.createdAt = container.createdAt;
                } else {
                     console.warn("createdAt missing or invalid when archiving, using current time as fallback for daysInYard calculation basis.");
                     archivedData.createdAt = now; // Fallback, though daysInYard might be inaccurate
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
        if (!container) return; // Add check
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
         if (!container) return; // Add check
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
        if (!container) return; // Add check
        setIsSaving(true);
        const batch = writeBatch(db);
        const liveRef = doc(db, containersPath, container.id);
        const archiveRef = doc(db, archivePath, container.id);

        const revivedData = { ...container, status: 'Revived - Awaiting Update', lastUpdate: Timestamp.now() };
        delete revivedData.archivedAt;
        delete revivedData.daysInYard;
        // Ensure createdAt is preserved as a Timestamp
         if (!(revivedData.createdAt instanceof Timestamp) && typeof revivedData.createdAt?.seconds === 'number') {
             // If it looks like a Firestore Timestamp object from JSON.stringify, convert it back
             revivedData.createdAt = Timestamp.fromMillis(revivedData.createdAt.seconds * 1000);
         } else if (!(revivedData.createdAt instanceof Timestamp)) {
             console.warn("createdAt was not a Timestamp during revive, using current time as fallback.");
             revivedData.createdAt = Timestamp.now(); // Fallback if conversion fails
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
        if (isNew && formData.booking) {
            return openBookings.find(b => b.id === formData.booking)?.type || null;
        }
        // If editing, find the booking associated with the container
        if (!isNew && container?.booking) {
             const currentBooking = [...openBookings, ...allArchivedContainers].find(b => b.id === container.booking);
             return currentBooking?.type || null;
        }
        return null;
    }, [formData.booking, openBookings, isNew, container, allArchivedContainers]); // Added container and allArchivedContainers

    const availableStatuses = useMemo(() => {
        const statuses = CONTAINER_STATUSES.filter(s => s.isDispatchOption);
        const currentStatus = formData?.status; // Use formData's status
        const isCurrentStatusInList = currentStatus && statuses.some(s => s.label === currentStatus);

        if (currentStatus && !isCurrentStatusInList) {
            const currentStatusInfo = CONTAINER_STATUSES.find(s => s.label === currentStatus) || { emoji: '📍', label: currentStatus };
            // Ensure the current status object has the required keys, even if custom
            const statusToAdd = { emoji: '📍', label: currentStatus, isUpdateOption: true, isDispatchOption: true, ...currentStatusInfo };
             statuses.unshift(statusToAdd);
        }
        return statuses;
    }, [formData?.status]); // Depend on formData's status

    const renderContent = () => {
        // More robust loading check
        if (!isNew && !formData.id) {
            // Add a specific check for the case where container prop exists but formData hasn't synced yet
             if(container && !formData.id) {
                 return <div className="p-6 text-center text-gray-400">Loading container details...</div>;
             }
             // Handle case where container prop itself might be missing initially
             return <div className="p-6 text-center text-gray-400">Waiting for container data...</div>;
        }
        if (isArchived) {
             // Ensure container exists for archived view
             if (!container) return <div className="p-6 text-center text-gray-400">Loading archived details...</div>;
             return (
                <div className="flex flex-col lg:flex-row">
                    <div className="p-4 lg:w-1/2 space-y-3">
                        <h3 className="text-lg font-semibold text-center mb-4">Archived Container Details</h3>
                        {Object.entries(container).map(([key, value]) => {
                           if (typeof value !== 'object' || value === null || value instanceof Timestamp) { // Render Timestamps too
                                // Format Timestamps nicely
                                let displayValue = String(value);
                                const dateValue = safeToDate(value); // Use helper
                                if (dateValue) {
                                    displayValue = dateValue.toLocaleString();
                                }
                                return <InputField key={key} label={key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')} value={displayValue} disabled />
                           }
                           return null;
                        })}
                         <div className="pt-4 flex justify-between items-center gap-3">
                             <button
                                onClick={() => setReviveConfirmOpen(true)}
                                disabled={isSaving}
                                className="flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md"
                            >
                                <UndoIcon />
                                Revive Container
                            </button>
                            <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-lg">Close</button>
                         </div>
                    </div>
                     <div className="p-4 lg:w-1/2 lg:border-l border-gray-700">
                        <h3 className="text-lg font-semibold mb-3">Event History</h3>
                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                            {events.length > 0 ? (
                                events.map(event => {
                                    const eventDate = safeToDate(event.timestamp);
                                    return (
                                        <div key={event.id} className="bg-gray-700 p-3 rounded-md text-sm">
                                            <p className="font-bold text-gray-200">{event.details.action}</p>
                                            {event.details.changes && <p className="text-gray-400 text-xs mt-1">{event.details.changes}</p>}
                                            <p className="text-xs text-gray-500 text-right mt-1">{eventDate ? eventDate.toLocaleString() : 'Invalid Date'}</p>
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-gray-500">No events found for this container.</p>
                            )}
                        </div>
                    </div>
                </div>
            )
        }

        if (isNew) {
            return (
                <>
                    <form onSubmit={handleSubmit} className="p-4 space-y-4">
                        <input type="file" ref={scanFileInputRef} onChange={handleImageProcess} className="hidden" accept="image/*" capture="environment" />
                        <input type="file" ref={uploadFileInputRef} onChange={handleImageProcess} className="hidden" accept="image/*" />
                        <div className="flex justify-between items-end gap-4">
                            <div className="flex-grow">
                                <label className="block text-sm font-medium text-gray-300 mb-1">Booking # *</label>
                                <select name="booking" value={formData.booking || ''} onChange={handleChange} className="w-full p-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    <option value="">-- Select an Open Booking --</option>
                                    {openBookings.map(b => <option key={b.id} value={b.id}>{b.id} ({b.type})</option>)}
                                </select>
                            </div>
                            <div className="flex gap-2">
                                <button type="button" onClick={() => scanFileInputRef.current.click()} className="flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg" title="Scan with Camera">
                                    <CameraIcon />
                                </button>
                                <button type="button" onClick={() => uploadFileInputRef.current.click()} className="flex items-center justify-center bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg" title="Upload Image">
                                    <UploadIcon />
                                </button>
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

        // --- Render logic for existing containers ---
        if (!container) return <div className="p-6 text-center text-gray-400">Error: Container data unavailable.</div>;

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

        if (container.status && container.status.startsWith('Assigned to Driver')) {
            const driver = collections.drivers.find(d => d.name === container.deliveryDriver);

            if (denialStep === 'choose') {
                return (
                    <div className="p-6 text-center">
                        <h3 className="text-lg font-semibold mb-4">What is the next step for this denied container?</h3>
                        <div className="flex justify-center gap-4">
                             <button onClick={handleReturnToTilter} disabled={isSaving} className="py-2 px-4 bg-orange-600 hover:bg-orange-500 rounded-lg">
                                Return to Tilter/Location
                            </button>
                            <button onClick={handleNeedsUpdatesAfterDenial} disabled={isSaving} className="py-2 px-4 bg-indigo-600 hover:bg-indigo-500 rounded-lg">
                                Needs Manual Update
                            </button>
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

        // Default: Render the main edit form using formData
        return (
            <div className="flex flex-col lg:flex-row">
                <form onSubmit={handleSubmit} className="p-4 lg:w-1/2 space-y-4">
                     {/* Use formData values for the form, provide defaults */}
                    <InputField label="Container #" name="id" value={formData.id || ''} disabled={true} />
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
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-lg">Cancel</button>
                            <button type="submit" disabled={isSaving} className="py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:bg-blue-800 disabled:cursor-not-allowed">{isSaving ? 'Saving...' : 'Save Changes'}</button>
                        </div>
                    </div>
                </form>
                <div className="p-4 lg:w-1/2 lg:border-l border-gray-700">
                    <h3 className="text-lg font-semibold mb-3">Event History</h3>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                         {events.length > 0 ? (
                            events.map(event => {
                                 const eventDate = safeToDate(event.timestamp);
                                return (
                                    <div key={event.id} className="bg-gray-700 p-3 rounded-md text-sm">
                                        <p className="font-bold text-gray-200">{event.details.action}</p>
                                        {event.details.changes && <p className="text-gray-400 text-xs mt-1">{event.details.changes}</p>}
                                        <p className="text-xs text-gray-500 text-right mt-1">{eventDate ? eventDate.toLocaleString() : 'Invalid Date'}</p>
                                    </div>
                                );
                            })
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
                     {/* Use optional chaining on container?.id for the title */}
                    <h2 className="text-xl font-bold">{isNew ? 'Add New Container' : `Edit: ${container?.id || '...'}`}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </header>
                <div className="flex-grow overflow-y-auto">
                    {/* Render content only when formData is populated for existing containers, or if it's new */}
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


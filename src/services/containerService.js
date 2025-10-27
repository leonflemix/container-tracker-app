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
import { calculateDaysBetween } from '../utils/dates';

// Create a new container (with event) and optionally archive booking when full
export async function createContainerWithBooking({
    containersPath,
    eventsPath,
    bookingsPath,
    archivedBookingsPath,
    formData,
    openBookings,
    filledBookingCounts = {}
}) {
    const selectedBooking = openBookings.find(b => b.id === formData.booking);
    if (!selectedBooking) throw new Error('Selected booking is not valid or no longer open.');

    const containerId = formData.id.toUpperCase();
    const containerRef = doc(db, containersPath, containerId);
    const batch = writeBatch(db);

    const dataToSave = {
        id: containerId,
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

    const eventData = {
        containerId,
        timestamp: Timestamp.now(),
        details: { 
            action: `Container created with status: New for booking ${formData.booking}`,
            previousData: null // No previous data for a new container
        }
    };

    batch.set(containerRef, dataToSave);
    batch.set(doc(collection(db, eventsPath)), eventData);

    const currentFilledCount = filledBookingCounts[selectedBooking.id] || 0;
    if (currentFilledCount + 1 >= selectedBooking.quantity) {
        const bookingToArchiveRef = doc(db, bookingsPath, selectedBooking.id);
        const archivedBookingRef = doc(db, archivedBookingsPath, selectedBooking.id);
        const archivedBookingData = { ...selectedBooking, archivedAt: Timestamp.now() };
        batch.set(archivedBookingRef, archivedBookingData);
        batch.delete(bookingToArchiveRef);
    }

    await batch.commit();
    return { success: true };
}

// Update an existing container and write an event if there are changes
export async function updateContainerWithChanges({
    containersPath,
    eventsPath,
    container,
    formData
}) {
    if (!container) throw new Error('Container data missing for update.');

    const containerRef = doc(db, containersPath, container.id.toUpperCase());
    const dataToUpdate = { ...formData, lastUpdate: Timestamp.now() };
    if (container.createdAt) dataToUpdate.createdAt = container.createdAt;
    else dataToUpdate.createdAt = Timestamp.now();

    const changes = [];
    for (const key in dataToUpdate) {
        if (Object.hasOwnProperty.call(dataToUpdate, key) && dataToUpdate[key] !== container[key]) {
            // Handle Timestamp comparisons
            const oldVal = container[key];
            const newVal = dataToUpdate[key];
            
            let changed = true;
            if (oldVal && typeof oldVal.toDate === 'function' && newVal && typeof newVal.toDate === 'function') {
                changed = !oldVal.isEqual(newVal);
            } else if (oldVal instanceof Date && newVal instanceof Date) {
                changed = oldVal.getTime() !== newVal.getTime();
            } else {
                changed = oldVal !== newVal;
            }

            if (changed) {
                 changes.push(`${key} changed from '${oldVal === undefined ? '' : oldVal}' to '${newVal}'`);
            }
        }
    }

    // Ensure ID is set correctly (it might not be in formData if disabled)
    dataToUpdate.id = container.id.toUpperCase();

    if (changes.length === 0) {
        return { updated: false, message: 'No changes detected' };
    }

    const batch = writeBatch(db);
    batch.set(containerRef, dataToUpdate, { merge: true });
    
    // --- NEW: Store the *entire* previous container state in the event ---
    const eventData = {
        containerId: container.id.toUpperCase(),
        timestamp: Timestamp.now(),
        details: { 
            action: 'Container updated', 
            changes: changes.join('; '),
            previousData: container // Save the exact previous state
        }
    };
    batch.set(doc(collection(db, eventsPath)), eventData);
    await batch.commit();
    return { updated: true };
}

export async function deleteContainerAndEvents({ containersPath, eventsPath, containerId }) {
    if (!containerId) throw new Error('containerId is required.');
    await deleteDoc(doc(db, containersPath, containerId));
    const eventsQuery = query(collection(db, eventsPath), where('containerId', '==', containerId));
    const eventsSnapshot = await getDocs(eventsQuery);
    const batch = writeBatch(db);
    eventsSnapshot.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    return { deleted: true };
}

export async function moveContainerToLocation({ containersPath, eventsPath, containerId, selectedLocation }) {
    // This is a simple status change, but we should read the container first
    // to store its previous state for undo.
    const containerRef = doc(db, containersPath, containerId.toUpperCase());
    const containerSnap = await getDoc(containerRef);
    if (!containerSnap.exists()) throw new Error("Container not found");
    const containerData = containerSnap.data();

    const batch = writeBatch(db);
    batch.set(containerRef, { status: selectedLocation, lastUpdate: Timestamp.now() }, { merge: true });
    
    const eventData = {
        containerId: containerId.toUpperCase(),
        timestamp: Timestamp.now(),
        details: { 
            action: 'Container moved to location', 
            changes: `Status changed from '${containerData.status}' to '${selectedLocation}'`,
            previousData: containerData // Save previous state
        }
    };
    batch.set(doc(collection(db, eventsPath)), eventData);
    await batch.commit();
    return { moved: true };
}

export async function markContainerAsLoaded({ containersPath, eventsPath, containerId, oldStatus }) {
    const containerRef = doc(db, containersPath, containerId.toUpperCase());
    const containerSnap = await getDoc(containerRef);
    if (!containerSnap.exists()) throw new Error("Container not found");
    const containerData = containerSnap.data();

    const newStatus = 'Loading Complete';
    const batch = writeBatch(db);
    batch.set(containerRef, { status: newStatus, lastUpdate: Timestamp.now() }, { merge: true });
    
    const eventData = {
        containerId: containerId.toUpperCase(),
        timestamp: Timestamp.now(),
        details: { 
            action: 'Container loaded', 
            changes: `Status changed from '${oldStatus}' to '${newStatus}'`,
            previousData: containerData // Save previous state
        }
    };
    batch.set(doc(collection(db, eventsPath)), eventData);
    await batch.commit();
    return { loaded: true };
}

export async function assignDriverToContainer({ containersPath, eventsPath, containerId, selectedDriver }) {
    const containerRef = doc(db, containersPath, containerId.toUpperCase());
    const containerSnap = await getDoc(containerRef);
    if (!containerSnap.exists()) throw new Error("Container not found");
    const containerData = containerSnap.data();

    const newStatus = `Assigned to Driver - ${selectedDriver}`;
    const batch = writeBatch(db);
    batch.set(containerRef, { status: newStatus, deliveryDriver: selectedDriver, lastUpdate: Timestamp.now() }, { merge: true });
    
    const eventData = {
        containerId: containerId.toUpperCase(),
        timestamp: Timestamp.now(),
        details: { 
            action: 'Assigned to delivery driver', 
            changes: `Assigned to ${selectedDriver}`,
            previousData: containerData // Save previous state
        }
    };
    batch.set(doc(collection(db, eventsPath)), eventData);
    await batch.commit();
    return { assigned: true };
}

// --- REWRITTEN: Robust Undo ---
export async function undoLastUpdate({ containersPath, eventsPath, container, lastEvent }) {
    if (!container || !lastEvent) throw new Error('container and lastEvent required for undo.');
    
    // 1. Get the state to restore from the event
    const stateToRestore = lastEvent.details?.previousData;
    if (!stateToRestore) {
        throw new Error('Cannot undo: This event does not contain the required undo data.');
    }

    const containerRef = doc(db, containersPath, container.id);
    
    // 2. Prepare the data to write
    const dataToWrite = { ...stateToRestore };

    // 3. Convert any JS Dates (from old container object) back to Timestamps
    if (dataToWrite.createdAt && !(dataToWrite.createdAt instanceof Timestamp)) {
        dataToWrite.createdAt = Timestamp.fromDate(new Date(dataToWrite.createdAt));
    }
    // Set lastUpdate to now, not the restored time
    dataToWrite.lastUpdate = Timestamp.now(); 
    
    // 4. Atomically set the restored data and delete the "undo" event
    const batch = writeBatch(db);
    batch.set(containerRef, dataToWrite); // Overwrite with the restored state
    batch.delete(doc(db, eventsPath, lastEvent.id)); // Delete the event we just undid
    
    await batch.commit();
    return { undone: true };
}

export async function pierAcceptAndArchive({ containersPath, eventsPath, archivePath, container }) {
    if (!container) throw new Error('container required.');
    const containerRef = doc(db, containersPath, container.id);
    const archiveRef = doc(db, archivePath, container.id);
    const now = Timestamp.now();
    const daysInYard = calculateDaysBetween(container.createdAt, now);
    const archivedData = { ...container, status: 'Pier Accepted', archivedAt: now, daysInYard };
    
    if (archivedData.createdAt && !(archivedData.createdAt instanceof Timestamp)) {
        archivedData.createdAt = Timestamp.fromDate(new Date(archivedData.createdAt));
    }
    if (archivedData.lastUpdate && !(archivedData.lastUpdate instanceof Timestamp)) {
        archivedData.lastUpdate = Timestamp.fromDate(new Date(archivedData.lastUpdate));
    }

    const batch = writeBatch(db);
    batch.set(archiveRef, archivedData);
    batch.delete(containerRef);
    
    const eventData = { 
        containerId: container.id.toUpperCase(), 
        timestamp: now, 
        details: { 
            action: 'Pier Accepted & Archived',
            previousData: container // Save state before archiving
        } 
    };
    batch.set(doc(collection(db, eventsPath)), eventData);
    await batch.commit();
    return { archived: true };
}

export async function returnToTilter({ containersPath, eventsPath, containerId }) {
    const containerRef = doc(db, containersPath, containerId);
    const containerSnap = await getDoc(containerRef);
    if (!containerSnap.exists()) throw new Error("Container not found");
    const containerData = containerSnap.data();

    const newStatus = 'New';
    const batch = writeBatch(db);
    batch.set(containerRef, { status: newStatus, lastUpdate: Timestamp.now() }, { merge: true });
    
    const eventData = { 
        containerId: containerId.toUpperCase(), 
        timestamp: Timestamp.now(), 
        details: { 
            action: 'Pier Denied - Returned to Tilter/Location',
            previousData: containerData // Save previous state
        } 
    };
    batch.set(doc(collection(db, eventsPath)), eventData);
    await batch.commit();
    return { returned: true };
}

export async function markDeniedAwaitingUpdate({ containersPath, eventsPath, containerId }) {
    const containerRef = doc(db, containersPath, containerId);
    const containerSnap = await getDoc(containerRef);
    if (!containerSnap.exists()) throw new Error("Container not found");
    const containerData = containerSnap.data();

    const newStatus = 'Denied - Awaiting Update';
    const batch = writeBatch(db);
    batch.set(containerRef, { status: newStatus, lastUpdate: Timestamp.now() }, { merge: true });
    
    const eventData = { 
        containerId: containerId.toUpperCase(), 
        timestamp: Timestamp.now(), 
        details: { 
            action: 'Pier Denied - Awaiting Further Updates',
            previousData: containerData // Save previous state
        } 
    };
    batch.set(doc(collection(db, eventsPath)), eventData);
    await batch.commit();
    return { denied: true };
}

export async function reviveContainer({ containersPath, eventsPath, archivePath, container }) {
    if (!container) throw new Error('container required.');
    const liveRef = doc(db, containersPath, container.id);
    const archiveRef = doc(db, archivePath, container.id);
    const revivedData = { ...container, status: 'Revived - Awaiting Update', lastUpdate: Timestamp.now() };
    delete revivedData.archivedAt;
    delete revivedData.daysInYard;
    
    if (revivedData.createdAt && !(revivedData.createdAt instanceof Timestamp)) {
        revivedData.createdAt = Timestamp.fromDate(new Date(revivedData.createdAt));
    }

    const batch = writeBatch(db);
    batch.set(liveRef, revivedData);
    batch.delete(archiveRef);
    
    const eventData = { 
        containerId: container.id, 
        timestamp: Timestamp.now(), 
        details: { 
            action: 'Container Revived - Awaiting Update',
            previousData: null // No previous state in the live yard
        } 
    };
    batch.set(doc(collection(db, eventsPath)), eventData);
    await batch.commit();
    return { revived: true };
}

export async function markContainerAsRepaired({ containersPath, eventsPath, containerId, oldStatus }) {
    const containerRef = doc(db, containersPath, containerId.toUpperCase());
    const containerSnap = await getDoc(containerRef);
    if (!containerSnap.exists()) throw new Error("Container not found");
    const containerData = containerSnap.data();

    const newStatus = 'Repaired';
    const batch = writeBatch(db);
    batch.set(containerRef, { 
        status: newStatus, 
        lastUpdate: Timestamp.now() 
    }, { merge: true });
    
    const eventData = {
        containerId: containerId.toUpperCase(),
        timestamp: Timestamp.now(),
        details: { 
            action: 'Container repaired', 
            changes: `Status changed from '${oldStatus}' to '${newStatus}'`,
            previousData: containerData // Save previous state
        }
    };
    batch.set(doc(collection(db, eventsPath)), eventData);
    await batch.commit();
    return { repaired: true };
}

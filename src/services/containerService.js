// File: src/services/containerService.js
// Location: src/services

import { db, Timestamp } from '../firebase';
import {
    collection,
    doc,
    deleteDoc,
    query,
    where,
    getDocs,
    getDoc,
    writeBatch,
    setDoc // Ensure setDoc is imported
} from 'firebase/firestore';
import { calculateDaysBetween } from '../utils/dates';

// Create a new container (with event)
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
            previousData: null
        }
    };

    batch.set(containerRef, dataToSave);
    batch.set(doc(collection(db, eventsPath)), eventData);

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

    dataToUpdate.id = container.id.toUpperCase();

    if (changes.length === 0) {
        return { updated: false, message: 'No changes detected' };
    }

    const batch = writeBatch(db);
    batch.set(containerRef, dataToUpdate, { merge: true });
    
    const eventData = {
        containerId: container.id.toUpperCase(),
        timestamp: Timestamp.now(),
        details: { 
            action: 'Container updated', 
            changes: changes.join('; '),
            previousData: container
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

export async function moveContainerToLocation({ containersPath, eventsPath, containerId, selectedLocation, containerData: providedContainerData }) {
    const containerRef = doc(db, containersPath, containerId.toUpperCase());
    const containerData = providedContainerData || (await getDoc(containerRef)).data();
    if (!containerData) throw new Error("Container not found");

    const batch = writeBatch(db);
    batch.set(containerRef, { status: selectedLocation, lastUpdate: Timestamp.now() }, { merge: true });
    
    const eventData = {
        containerId: containerId.toUpperCase(),
        timestamp: Timestamp.now(),
        details: { 
            action: 'Container moved to location', 
            changes: `Status changed from '${containerData.status}' to '${selectedLocation}'`,
            previousData: containerData
        }
    };
    batch.set(doc(collection(db, eventsPath)), eventData);
    await batch.commit();
    return { moved: true };
}

export async function markContainerAsLoaded({ containersPath, eventsPath, containerId, oldStatus, containerData: providedContainerData }) {
    const containerRef = doc(db, containersPath, containerId.toUpperCase());
    const containerData = providedContainerData || (await getDoc(containerRef)).data();
    if (!containerData) throw new Error("Container not found");
    
    const newStatus = 'Loading Complete';
    const batch = writeBatch(db);
    batch.set(containerRef, { status: newStatus, lastUpdate: Timestamp.now() }, { merge: true });
    
    const eventData = {
        containerId: containerId.toUpperCase(),
        timestamp: Timestamp.now(),
        details: { 
            action: 'Container loaded', 
            changes: `Status changed from '${oldStatus}' to '${newStatus}'`,
            previousData: containerData
        }
    };
    batch.set(doc(collection(db, eventsPath)), eventData);
    await batch.commit();
    return { loaded: true };
}

export async function assignDriverToContainer({ containersPath, eventsPath, containerId, selectedDriver, containerData: providedContainerData }) {
    const containerRef = doc(db, containersPath, containerId.toUpperCase());
    const containerData = providedContainerData || (await getDoc(containerRef)).data();
    if (!containerData) throw new Error("Container not found");

    const newStatus = `Assigned to Driver - ${selectedDriver}`;
    const batch = writeBatch(db);
    batch.set(containerRef, { status: newStatus, deliveryDriver: selectedDriver, lastUpdate: Timestamp.now() }, { merge: true });
    
    const eventData = {
        containerId: containerId.toUpperCase(),
        timestamp: Timestamp.now(),
        details: { 
            action: 'Assigned to delivery driver', 
            changes: `Assigned to ${selectedDriver}`,
            previousData: containerData
        }
    };
    batch.set(doc(collection(db, eventsPath)), eventData);
    await batch.commit();
    return { assigned: true };
}

export async function undoLastUpdate({ containersPath, eventsPath, containerId, lastEventId, dataToRestore }) {
    if (!containerId || !lastEventId || !dataToRestore) {
        throw new Error('Missing required arguments for undo.');
    }
    
    const containerRef = doc(db, containersPath, containerId);
    const dataToWrite = { ...dataToRestore };

    if (dataToWrite.createdAt && !(dataToWrite.createdAt instanceof Timestamp) && typeof dataToWrite.createdAt.seconds === 'number') {
        dataToWrite.createdAt = Timestamp.fromMillis(dataToWrite.createdAt.seconds * 1000);
    }
    dataToWrite.lastUpdate = Timestamp.now(); 
    
    const batch = writeBatch(db);
    batch.set(containerRef, dataToWrite); 
    batch.delete(doc(db, eventsPath, lastEventId)); 
    
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
    
    if (archivedData.createdAt && !(archivedData.createdAt instanceof Timestamp) && typeof archivedData.createdAt.seconds === 'number') {
        archivedData.createdAt = Timestamp.fromMillis(archivedData.createdAt.seconds * 1000);
    }
    if (archivedData.lastUpdate && !(archivedData.lastUpdate instanceof Timestamp) && typeof archivedData.lastUpdate.seconds === 'number') {
        archivedData.lastUpdate = Timestamp.fromMillis(archivedData.lastUpdate.seconds * 1000);
    }

    const batch = writeBatch(db);
    batch.set(archiveRef, archivedData);
    batch.delete(containerRef);
    
    const eventData = { 
        containerId: container.id.toUpperCase(), 
        timestamp: now, 
        details: { 
            action: 'Pier Accepted & Archived',
            previousData: container
        } 
    };
    batch.set(doc(collection(db, eventsPath)), eventData);
    await batch.commit();
    return { archived: true };
}

export async function returnToTilter({ containersPath, eventsPath, containerId, containerData: providedContainerData }) {
    const containerRef = doc(db, containersPath, containerId);
    const containerData = providedContainerData || (await getDoc(containerRef)).data();
    if (!containerData) throw new Error("Container not found");

    const newStatus = 'New';
    const batch = writeBatch(db);
    batch.set(containerRef, { status: newStatus, lastUpdate: Timestamp.now() }, { merge: true });
    
    const eventData = { 
        containerId: containerId.toUpperCase(), 
        timestamp: Timestamp.now(), 
        details: { 
            action: 'Pier Denied - Returned to Tilter/Location',
            previousData: containerData
        } 
    };
    batch.set(doc(collection(db, eventsPath)), eventData);
    await batch.commit();
    return { returned: true };
}

export async function markDeniedAwaitingUpdate({ containersPath, eventsPath, containerId, containerData: providedContainerData }) {
    const containerRef = doc(db, containersPath, containerId);
    const containerData = providedContainerData || (await getDoc(containerRef)).data();
    if (!containerData) throw new Error("Container not found");

    const newStatus = 'Denied - Awaiting Update';
    const batch = writeBatch(db);
    batch.set(containerRef, { status: newStatus, lastUpdate: Timestamp.now() }, { merge: true });
    
    const eventData = { 
        containerId: containerId.toUpperCase(), 
        timestamp: Timestamp.now(), 
        details: { 
            action: 'Pier Denied - Awaiting Further Updates',
            previousData: containerData
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
    
    if (revivedData.createdAt && !(revivedData.createdAt instanceof Timestamp) && typeof revivedData.createdAt.seconds === 'number') {
        revivedData.createdAt = Timestamp.fromMillis(revivedData.createdAt.seconds * 1000);
    }

    const batch = writeBatch(db);
    batch.set(liveRef, revivedData);
    batch.delete(archiveRef);
    
    const eventData = { 
        containerId: container.id, 
        timestamp: Timestamp.now(), 
        details: { 
            action: 'Container Revived - Awaiting Update',
            previousData: null
        } 
    };
    batch.set(doc(collection(db, eventsPath)), eventData);
    await batch.commit();
    return { revived: true };
}

export async function markContainerAsRepaired({ containersPath, eventsPath, containerId, oldStatus, containerData: providedContainerData }) {
    const containerRef = doc(db, containersPath, containerId.toUpperCase());
    const containerData = providedContainerData || (await getDoc(containerRef)).data();
    if (!containerData) throw new Error("Container not found");

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
            previousData: containerData
        }
    };
    batch.set(doc(collection(db, eventsPath)), eventData);
    await batch.commit();
    return { repaired: true };
}

// Manual Archive for Bookings
export async function archiveBooking({ bookingsPath, archivedBookingsPath, booking }) {
    const bookingToArchiveRef = doc(db, bookingsPath, booking.id);
    const archivedBookingRef = doc(db, archivedBookingsPath, booking.id);
    
    const archivedBookingData = { ...booking, archivedAt: Timestamp.now() };
    
    const batch = writeBatch(db);
    batch.set(archivedBookingRef, archivedBookingData);
    batch.delete(bookingToArchiveRef);
    
    await batch.commit();
    return { archived: true };
}

// --- NEW: Unarchive Booking (Move back to active) ---
export async function unarchiveBooking({ bookingsPath, archivedBookingsPath, booking }) {
    const bookingToActiveRef = doc(db, bookingsPath, booking.id);
    const archivedBookingRef = doc(db, archivedBookingsPath, booking.id);
    
    // Create data for active (remove archivedAt)
    const activeBookingData = { ...booking };
    delete activeBookingData.archivedAt;
    
    const batch = writeBatch(db);
    batch.set(bookingToActiveRef, activeBookingData);
    batch.delete(archivedBookingRef);
    
    await batch.commit();
    return { unarchived: true };
}

// --- NEW: Assign Driver to Booking ---
export async function assignDriverToBooking({ bookingPath, bookingId, driverName }) {
    const bookingRef = doc(db, bookingPath, bookingId);
    await setDoc(bookingRef, { assignedDriver: driverName }, { merge: true });
    return { success: true };
}
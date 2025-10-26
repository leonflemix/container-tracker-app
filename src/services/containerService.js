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
        details: { action: `Container created with status: New for booking ${formData.booking}` }
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
            if (!(container[key] instanceof Timestamp && dataToUpdate[key] instanceof Timestamp && container[key].isEqual(dataToUpdate[key]))) {
                changes.push(`${key} changed from '${container[key] === undefined ? '' : container[key]}' to '${dataToUpdate[key]}'`);
            }
        }
    }

    delete dataToUpdate.id;

    if (changes.length === 0) {
        return { updated: false, message: 'No changes detected' };
    }

    const batch = writeBatch(db);
    batch.set(containerRef, dataToUpdate, { merge: true });
    const eventData = {
        containerId: container.id.toUpperCase(),
        timestamp: Timestamp.now(),
        details: { action: 'Container updated', changes: changes.join('; ') }
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
    const containerRef = doc(db, containersPath, containerId.toUpperCase());
    await setDoc(containerRef, { status: selectedLocation, lastUpdate: Timestamp.now() }, { merge: true });
    const eventData = {
        containerId: containerId.toUpperCase(),
        timestamp: Timestamp.now(),
        details: { action: 'Container moved to location', changes: `Status changed to '${selectedLocation}'` }
    };
    await addDoc(collection(db, eventsPath), eventData);
    return { moved: true };
}

export async function markContainerAsLoaded({ containersPath, eventsPath, containerId, oldStatus }) {
    const containerRef = doc(db, containersPath, containerId.toUpperCase());
    const newStatus = 'Loading Complete';
    await setDoc(containerRef, { status: newStatus, lastUpdate: Timestamp.now() }, { merge: true });
    const eventData = {
        containerId: containerId.toUpperCase(),
        timestamp: Timestamp.now(),
        details: { action: 'Container loaded', changes: `Status changed from '${oldStatus}' to '${newStatus}'` }
    };
    await addDoc(collection(db, eventsPath), eventData);
    return { loaded: true };
}

export async function assignDriverToContainer({ containersPath, eventsPath, containerId, selectedDriver }) {
    const containerRef = doc(db, containersPath, containerId.toUpperCase());
    const newStatus = `Assigned to Driver - ${selectedDriver}`;
    await setDoc(containerRef, { status: newStatus, deliveryDriver: selectedDriver, lastUpdate: Timestamp.now() }, { merge: true });
    const eventData = {
        containerId: containerId.toUpperCase(),
        timestamp: Timestamp.now(),
        details: { action: 'Assigned to delivery driver', changes: `Assigned to ${selectedDriver}` }
    };
    await addDoc(collection(db, eventsPath), eventData);
    return { assigned: true };
}

// Undo last update using the lastEvent.details.changes string
export async function undoLastUpdate({ containersPath, eventsPath, container, lastEvent }) {
    if (!container || !lastEvent) throw new Error('container and lastEvent required for undo.');
    const containerRef = doc(db, containersPath, container.id);
    let stateToRestore = JSON.parse(JSON.stringify(container));
    const changesToRevert = (lastEvent.details.changes || '').split('; ');
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
            }
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
    if (lastEvent.id) batch.delete(doc(db, eventsPath, lastEvent.id));
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
    if (container.createdAt instanceof Timestamp || (container.createdAt && typeof container.createdAt.seconds === 'number')) {
        archivedData.createdAt = container.createdAt;
    } else {
        archivedData.createdAt = now;
    }
    const batch = writeBatch(db);
    batch.set(archiveRef, archivedData);
    batch.delete(containerRef);
    const eventData = { containerId: container.id.toUpperCase(), timestamp: now, details: { action: 'Pier Accepted & Archived' } };
    batch.set(doc(collection(db, eventsPath)), eventData);
    await batch.commit();
    return { archived: true };
}

export async function returnToTilter({ containersPath, eventsPath, containerId }) {
    const containerRef = doc(db, containersPath, containerId);
    const newStatus = 'New';
    await setDoc(containerRef, { status: newStatus, lastUpdate: Timestamp.now() }, { merge: true });
    const eventData = { containerId: containerId.toUpperCase(), timestamp: Timestamp.now(), details: { action: 'Pier Denied - Returned to Tilter/Location' } };
    await addDoc(collection(db, eventsPath), eventData);
    return { returned: true };
}

export async function markDeniedAwaitingUpdate({ containersPath, eventsPath, containerId }) {
    const containerRef = doc(db, containersPath, containerId);
    const newStatus = 'Denied - Awaiting Update';
    await setDoc(containerRef, { status: newStatus, lastUpdate: Timestamp.now() }, { merge: true });
    const eventData = { containerId: containerId.toUpperCase(), timestamp: Timestamp.now(), details: { action: 'Pier Denied - Awaiting Further Updates' } };
    await addDoc(collection(db, eventsPath), eventData);
    return { denied: true };
}

export async function reviveContainer({ containersPath, eventsPath, archivePath, container }) {
    if (!container) throw new Error('container required.');
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

    const batch = writeBatch(db);
    batch.set(liveRef, revivedData);
    batch.delete(archiveRef);
    const eventData = { containerId: container.id, timestamp: Timestamp.now(), details: { action: 'Container Revived - Awaiting Update' } };
    batch.set(doc(collection(db, eventsPath)), eventData);
    await batch.commit();
    return { revived: true };
}

export async function markContainerAsRepaired({ containersPath, eventsPath, containerId, oldStatus }) {
    const containerRef = doc(db, containersPath, containerId.toUpperCase());
    const newStatus = 'Repaired';
    await setDoc(containerRef, { 
        status: newStatus, 
        lastUpdate: Timestamp.now() 
    }, { merge: true });
    
    const eventData = {
        containerId: containerId.toUpperCase(),
        timestamp: Timestamp.now(),
        details: { 
            action: 'Container repaired', 
            changes: `Status changed from '${oldStatus}' to '${newStatus}'` 
        }
    };
    await addDoc(collection(db, eventsPath), eventData);
    return { repaired: true };
}
// File: src/hooks/useContainerForm.js

import { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../context/AppContext';

/**
 * Manages the state of the container form (formData) and related derived state.
 * @param {object | null} container - The container being edited, or null if new.
 * @param {boolean} isNew - True if this is a new container.
 * @param {string | null} preselectedBooking - A booking ID to pre-populate.
 */
export default function useContainerForm(container, isNew, preselectedBooking) {
    const {
        openBookings,
        bookings,
        containers,
        archivedContainers
    } = useAppContext();

    // The single source of truth for all form data
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
        return {}; // Default empty state
    });

    // Effect to sync formData if the container prop changes (e.g., in archive view)
    // or if a preselected booking is added.
    useEffect(() => {
        if (!isNew && container) {
            // Only reset form if the container ID actually changes
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
            // If the modal is already open and the user selects a booking from
            // the booking modal, this will update the form.
            if (preselectedBooking && formData.booking !== preselectedBooking) {
                setFormData(prev => ({ ...prev, booking: preselectedBooking }));
            }
            if (formData.status !== 'New') {
                setFormData(prev => ({ ...prev, status: 'New' }));
            }
        }
    // We only want this to run when the *identity* of the container changes,
    // or when the preselectedBooking changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [container, isNew, preselectedBooking]);


    // Generic change handler for form inputs
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newFormData = { ...formData, [name]: type === 'checkbox' ? checked : value };

        // When booking changes, automatically update the 'bookedFor' (type) field
        if (name === 'booking') {
            const selectedBooking = openBookings.find(b => b.id === value);
            // Check all containers/bookings (live, archived, open) for existing type info
            const originalBooking = [...openBookings, ...bookings, ...containers, ...archivedContainers].find(b => b.id === value);
            
            if (selectedBooking) {
                newFormData.bookedFor = selectedBooking.type || 'N/A';
            } else if (originalBooking) {
                // Handle cases where booking is already archived but we're editing a container for it
                newFormData.bookedFor = originalBooking.type || originalBooking.bookedFor || 'N/A';
            } else {
                newFormData.bookedFor = 'N/A';
            }
        }

        setFormData(newFormData);
    };

    // Derived state: Calculate the container type based on the selected booking
    const selectedBookingType = useMemo(() => {
        if (isNew && formData.booking) {
            return openBookings.find(b => b.id === formData.booking)?.type || null;
        }
        if (!isNew && formData.booking) {
            const allKnownBookings = [...openBookings, ...bookings, ...containers, ...archivedContainers];
            const currentBooking = allKnownBookings.find(b => b.id === formData.booking);
            // Fallback to the container's own 'bookedFor' if not found
            return currentBooking?.type || currentBooking?.bookedFor || container.bookedFor || 'N/A';
        }
        return container?.bookedFor || null;
    }, [formData.booking, openBookings, isNew, container, containers, archivedContainers, bookings]);

    return {
        formData,
        setFormData,
        handleChange,
        selectedBookingType
    };
}

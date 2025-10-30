// File: src/components/ContainerModal.jsx
// Location: src/components

import React from 'react';
import useContainerForm from '../hooks/useContainerForm';
import useContainerActions from '../hooks/useContainerActions';
import ContainerModalView from './ContainerModalView';
import { useAppContext }
    from '../context/AppContext'; // Import context

export default function ContainerModal(props) {
    const { isArchived, preselectedBooking, onClose } = props;

    // Get data directly from context
    const { selectedContainer, events } = useAppContext();

    // Determine if this is a new container
    const isNew = !selectedContainer;

    // 1. Manage form state
    const {
        formData,
        setFormData,
        handleChange,
        selectedBookingType
    } = useContainerForm(selectedContainer, isNew, preselectedBooking);

    // 2. Manage all actions
    const actions = useContainerActions({
        container: selectedContainer,
        formData,
        setFormData,
        events,
        onClose,
        isArchived,
        isNew
    });

    // 3. Pass everything to the View component
    // We pass ...props to forward `key`
    return (
        <ContainerModalView
            {...props}
            {...actions}
            isNew={isNew}
            container={selectedContainer}
            events={events}
            formData={formData}
            handleChange={handleChange}
            selectedBookingType={selectedBookingType}
        />
    );
}

import React from 'react';
import InputField from './InputField';
import EventHistory from './EventHistory';
import ConfirmationModal from './ConfirmationModal';

import NewContainerForm from './NewContainerForm';
import EditContainerForm from './EditContainerForm';
import LocationMoveForm from './LocationMoveForm';
import AssignDriverForm from './AssignDriverForm';
import AssignedDriverPanel from './AssignedDriverPanel';
import ArchivedContainerView from './ArchivedContainerView';
import ImageUploadButtons from './ImageUploadButtons';
import WorkshopPanel from './WorkshopPanel';

export default function ContainerModalView(props) {
    const {
        // state + data
        isNew,
        isArchived,
        formData,
        isSaving,
        isImageProcessing,
        container,
        events, // This is now needed by EditContainerForm
        openBookings,
        collections,

        // refs
        scanFileInputRef,
        uploadFileInputRef,

        // derived
        isAtLocation,
        selectedBookingType,
        availableStatuses,

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
        handleRevive,
        isInWorkshop,
        handleMarkAsRepaired,

        // modal controls
        isDeleteConfirmOpen,
        setDeleteConfirmOpen,
        isReviveConfirmOpen,
        setReviveConfirmOpen,
        onClose,
        selectedDriver,
        setSelectedDriver,
        selectedLocation,
        setSelectedLocation,
        denialStep,
        setDenialStep,
        isEditingCoreDetails,
        setIsEditingCoreDetails
    } = props;

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

        if (isInWorkshop) {
            return <WorkshopPanel
                container={container}
                isSaving={isSaving}
                handleMarkAsRepaired={handleMarkAsRepaired}
                onClose={onClose}
            />;
        }

        // Default: edit form + history
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
                    events={events} // <-- PASS EVENTS HERE
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

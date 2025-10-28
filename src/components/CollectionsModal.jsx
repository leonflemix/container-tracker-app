// File: src/components/CollectionsModal.jsx
import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import CollectionManager from './CollectionManager';
import { useAppContext } from '../context/AppContext'; // Import context

export default function CollectionsModal({ onClose }) { // Remove unused props
    // --- Get data from context ---
    const {
        paths: contextPaths, // Rename to avoid conflict
        collections: collectionsData, // Get collections data
        addToast
    } = useAppContext();

    // --- Add defensive check for paths ---
    const paths = contextPaths || {};
    // Define paths for collections based on contextPaths.collections
    const collectionPaths = {
        drivers: paths.collections?.drivers,
        locations: paths.collections?.locations,
        chassis: paths.collections?.chassis,
        containerTypes: paths.collections?.containerTypes,
    };
    // ---

    // --- Add defensive check for collectionsData ---
    const collections = collectionsData || {};
    const driversData = collections.drivers || [];
    const locationsData = collections.locations || [];
    const chassisData = collections.chassis || [];
    const containerTypesData = collections.containerTypes || [];
    // ---

    const [activeTab, setActiveTab] = useState('drivers');

    const handleSave = async (collectionName, data, isNew) => {
        // Use the derived collectionPaths
        const path = collectionPaths[collectionName];
        if (!path) {
            addToast(`Configuration error: Path for ${collectionName} not found.`, 'error');
            console.error(`Path for ${collectionName} not found in context paths.`);
            return;
        }
        const docRef = isNew ? doc(collection(db, path)) : doc(db, path, data.docId);
        const dataToSave = { ...data };
        delete dataToSave.docId; // Remove docId before saving
        try {
            await setDoc(docRef, dataToSave, { merge: !isNew }); // Use merge: !isNew for update/create
            addToast(`${collectionName.slice(0, -1)} item saved successfully!`, 'success');
        } catch (error) {
            console.error(`Error saving to ${collectionName}:`, error);
            addToast(`Failed to save item in ${collectionName}.`, 'error');
        }
    };

    const handleDelete = async (collectionName, docId) => {
        // Use the derived collectionPaths
        const path = collectionPaths[collectionName];
        if (!path) {
            addToast(`Configuration error: Path for ${collectionName} not found.`, 'error');
            console.error(`Path for ${collectionName} not found in context paths.`);
            return;
        }
        try {
            await deleteDoc(doc(db, path, docId));
            addToast(`${collectionName.slice(0, -1)} item deleted successfully!`, 'success');
        } catch (error) {
            console.error(`Error deleting from ${collectionName}:`, error);
            addToast(`Failed to delete item from ${collectionName}.`, 'error');
        }
    };

    // Click handler for closing modal when clicking backdrop
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    // Click handler to stop propagation when clicking inside modal content
    const handleContentClick = (e) => {
        e.stopPropagation();
    };


    return (
        // Add backdrop click handler
        <div onClick={handleBackdropClick} className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
             {/* Add content click handler */}
            <div onClick={handleContentClick} className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <header className="flex justify-between items-center p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold">Manage Collections</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
                </header>
                <div className="border-b border-gray-700">
                    <nav className="flex space-x-4 p-4">
                        <button onClick={() => setActiveTab('drivers')} className={`px-3 py-2 text-sm font-medium rounded-md ${activeTab === 'drivers' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>Drivers</button>
                        <button onClick={() => setActiveTab('locations')} className={`px-3 py-2 text-sm font-medium rounded-md ${activeTab === 'locations' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>Locations</button>
                        <button onClick={() => setActiveTab('chassis')} className={`px-3 py-2 text-sm font-medium rounded-md ${activeTab === 'chassis' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>Chassis</button>
                        <button onClick={() => setActiveTab('containerTypes')} className={`px-3 py-2 text-sm font-medium rounded-md ${activeTab === 'containerTypes' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>Container Types</button>
                    </nav>
                </div>
                <div className="p-4 overflow-y-auto">
                     {/* Use the safe data arrays */}
                    {activeTab === 'drivers' && <CollectionManager collectionName="drivers" data={driversData} onSave={handleSave} onDelete={handleDelete} fields={{name: 'text', id: 'text', plate: 'text', weight: 'number'}} />}
                    {activeTab === 'locations' && <CollectionManager collectionName="locations" data={locationsData} onSave={handleSave} onDelete={handleDelete} fields={{location: 'text'}} />}
                    {activeTab === 'chassis' && <CollectionManager collectionName="chassis" data={chassisData} onSave={handleSave} onDelete={handleDelete} fields={{id: 'text', weight: 'number', is2x20: 'boolean', is40ft: 'boolean'}} />}
                    {activeTab === 'containerTypes' && <CollectionManager collectionName="containerTypes" data={containerTypesData} onSave={handleSave} onDelete={handleDelete} fields={{name: 'text', color: 'color'}} />}
                </div>
            </div>
        </div>
    );
}


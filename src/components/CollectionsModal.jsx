// File: src/components/CollectionsModal.jsx
import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import CollectionManager from './CollectionManager';

export default function CollectionsModal({ onClose, paths, collectionsData, addToast }) {
    const [activeTab, setActiveTab] = useState('drivers');

    // --- FIX: Add defensive checks for collectionsData ---
    const safeCollectionsData = collectionsData || {};
    const safeDrivers = safeCollectionsData.drivers || [];
    const safeLocations = safeCollectionsData.locations || [];
    const safeChassis = safeCollectionsData.chassis || [];
    const safeContainerTypes = safeCollectionsData.containerTypes || [];
    // ---

    const handleSave = async (collectionName, data, isNew) => {
        const path = paths[collectionName];
        const docRef = isNew ? doc(collection(db, path)) : doc(db, path, data.docId);
        const dataToSave = { ...data };
        delete dataToSave.docId;
        try {
            await setDoc(docRef, dataToSave, { merge: !isNew });
            addToast(`${collectionName.slice(0, -1)} item saved successfully!`, 'success');
        } catch (error) { 
            console.error(`Error saving to ${collectionName}:`, error); 
            addToast(`Failed to save item in ${collectionName}.`, 'error');
        }
    };
    
    const handleDelete = async (collectionName, docId) => {
        try {
            await deleteDoc(doc(db, paths[collectionName], docId));
            addToast(`${collectionName.slice(0, -1)} item deleted successfully!`, 'success');
        } catch (error) { 
            console.error(`Error deleting from ${collectionName}:`, error);
            addToast(`Failed to delete item from ${collectionName}.`, 'error');
        }
    };
    
    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4"
            onClick={onClose} // --- ADDED: Click backdrop to close ---
        >
            <div 
                className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()} // --- ADDED: Stop click propagation ---
            >
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
                    {/* --- FIX: Use safe data variables --- */}
                    {activeTab === 'drivers' && <CollectionManager collectionName="drivers" data={safeDrivers} onSave={handleSave} onDelete={handleDelete} fields={{name: 'text', id: 'text', plate: 'text', weight: 'number'}} />}
                    {activeTab === 'locations' && <CollectionManager collectionName="locations" data={safeLocations} onSave={handleSave} onDelete={handleDelete} fields={{location: 'text'}} />}
                    {activeTab === 'chassis' && <CollectionManager collectionName="chassis" data={safeChassis} onSave={handleSave} onDelete={handleDelete} fields={{id: 'text', weight: 'number', is2x20: 'boolean', is40ft: 'boolean'}} />}
                    {activeTab === 'containerTypes' && <CollectionManager collectionName="containerTypes" data={safeContainerTypes} onSave={handleSave} onDelete={handleDelete} fields={{name: 'text', color: 'color'}} />}
                </div>
            </div>
        </div>
    );
}


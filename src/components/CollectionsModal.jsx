// File: src/components/CollectionsModal.jsx
import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import TabButton from './TabButton';
import CollectionManager from './CollectionManager';

export default function CollectionsModal({ onClose, paths, collectionsData }) {
    const [activeTab, setActiveTab] = useState('drivers');

    const handleSave = async (collectionName, data, isNew) => {
        const path = paths[collectionName];
        const docRef = isNew ? doc(collection(db, path)) : doc(db, path, data.docId);
        const dataToSave = { ...data };
        delete dataToSave.docId;
        try {
            await setDoc(docRef, dataToSave, { merge: !isNew });
        } catch (error) { console.error(`Error saving to ${collectionName}:`, error); }
    };
    
    const handleDelete = async (collectionName, docId) => {
        try {
            await deleteDoc(doc(db, paths[collectionName], docId));
        } catch (error) { console.error(`Error deleting from ${collectionName}:`, error); }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
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
                    {activeTab === 'drivers' && <CollectionManager collectionName="drivers" data={collectionsData.drivers} onSave={handleSave} onDelete={handleDelete} fields={{name: 'text', id: 'text', plate: 'text', weight: 'number'}} />}
                    {activeTab === 'locations' && <CollectionManager collectionName="locations" data={collectionsData.locations} onSave={handleSave} onDelete={handleDelete} fields={{location: 'text'}} />}
                    {activeTab === 'chassis' && <CollectionManager collectionName="chassis" data={collectionsData.chassis} onSave={handleSave} onDelete={handleDelete} fields={{id: 'text', weight: 'number', is2x20: 'boolean', is40ft: 'boolean'}} />}
                    {activeTab === 'containerTypes' && <CollectionManager collectionName="containerTypes" data={collectionsData.containerTypes} onSave={handleSave} onDelete={handleDelete} fields={{name: 'text', color: 'color'}} />}
                </div>
            </div>
        </div>
    );
}
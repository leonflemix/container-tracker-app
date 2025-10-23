import React, { useState } from 'react';
import CollectionForm from './CollectionForm';
import ConfirmationModal from './ConfirmationModal';

export default function CollectionManager({ collectionName, data = [], onSave, onDelete, fields }) {
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [itemToDelete, setItemToDelete] = useState(null);

    const openForm = (item = null) => {
        if (item) {
            setEditingItem(item);
        } else {
            const initial = Object.keys(fields).reduce((acc, key) => {
                acc[key] = fields[key] === 'boolean' ? false : fields[key] === 'number' ? 0 : '';
                return acc;
            }, {});
            setEditingItem(initial);
        }
        setIsFormOpen(true);
    };

    const handleSave = (formData) => {
        onSave(collectionName, formData, !formData.docId);
        setIsFormOpen(false);
        setEditingItem(null);
    };

    const confirmDelete = () => {
        if (itemToDelete) {
            onDelete(collectionName, itemToDelete.docId);
            setItemToDelete(null);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold capitalize">{collectionName}</h3>
                <button onClick={() => openForm()} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-sm">Add New</button>
            </div>

            {isFormOpen && (
                <CollectionForm
                    fields={fields}
                    initialData={editingItem}
                    onSave={handleSave}
                    onCancel={() => { setIsFormOpen(false); setEditingItem(null); }}
                />
            )}

            <div className="space-y-2">
                {data.map(item => (
                    <div key={item.docId} className="bg-gray-700 p-3 rounded-md flex justify-between items-center">
                        <div className="text-sm">
                            {Object.entries(fields).map(([key]) => (
                                <p key={key}><span className="font-semibold capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span> {String(item[key])}</p>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => openForm(item)} className="text-yellow-400 hover:text-yellow-300 text-xs">Edit</button>
                            <button onClick={() => setItemToDelete(item)} className="text-red-500 hover:text-red-400 text-xs">Delete</button>
                        </div>
                    </div>
                ))}
            </div>

            {itemToDelete && (
                <ConfirmationModal
                    message={`Are you sure you want to delete this item?`}
                    onConfirm={confirmDelete}
                    onCancel={() => setItemToDelete(null)}
                />
            )}
        </div>
    );
}
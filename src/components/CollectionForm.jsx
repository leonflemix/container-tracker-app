// File: src/components/CollectionForm.jsx

import React, { useState, useEffect } from 'react';
import InputField from './InputField';
import CheckboxField from './CheckboxField';

export default function CollectionForm({ fields, initialData = {}, onSave, onCancel }) {
    const [formData, setFormData] = useState({});

    useEffect(() => {
        const init = Object.keys(fields).reduce((acc, key) => {
            if (initialData && Object.prototype.hasOwnProperty.call(initialData, key)) {
                acc[key] = initialData[key];
            } else {
                acc[key] = fields[key] === 'boolean' ? false : fields[key] === 'number' ? 0 : '';
            }
            return acc;
        }, {});
        if (initialData && initialData.docId) init.docId = initialData.docId;
        setFormData(init);
    }, [fields, initialData]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="bg-gray-900 p-4 rounded-lg mb-4 space-y-3">
            {Object.entries(fields).map(([key, type]) => {
                if (type === 'boolean') {
                    return (
                        <CheckboxField
                            key={key}
                            label={key.replace(/([A-Z])/g, ' $1')}
                            name={key}
                            checked={!!formData[key]}
                            onChange={handleChange}
                        />
                    );
                }
                return (
                    <InputField
                        key={key}
                        label={key.replace(/([A-Z])/g, ' $1')}
                        name={key}
                        type={type}
                        value={formData[key] || ''}
                        onChange={handleChange}
                    />
                );
            })}

            <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={onCancel} className="bg-gray-600 hover:bg-gray-500 py-1 px-3 rounded text-sm">Cancel</button>
                <button type="submit" className="bg-green-600 hover:bg-green-500 py-1 px-3 rounded text-sm">Save</button>
            </div>
        </form>
    );
}

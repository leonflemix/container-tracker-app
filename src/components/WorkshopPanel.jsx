// File: src/components/WorkshopPanel.jsx
// Location: src/components

import React from 'react';
import InputField from './InputField';

export default function WorkshopPanel({
    container,
    isSaving,
    handleMarkAsRepaired,
    onClose
}) {
    return (
        <div className="p-4 flex flex-col items-center justify-center">
            <InputField label="Container #" name="id" value={container.id} disabled={true} />
            <InputField label="Current Status" name="status" value={container.status} disabled={true} />
            <div className="pt-6">
                <button 
                    onClick={handleMarkAsRepaired} 
                    disabled={isSaving} 
                    className="py-3 px-6 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-lg disabled:bg-green-800"
                >
                    {isSaving ? 'Updating...' : 'Mark as Repaired'}
                </button>
            </div>
        </div>
    );
}

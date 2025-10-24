// File: src/components/CheckboxField.jsx
import React from 'react';
export default function CheckboxField({ label, name, checked, onChange }) {
    return (
        <label className="flex items-center space-x-2 cursor-pointer">
            <input
                type="checkbox"
                name={name}
                checked={checked}
                onChange={onChange}
                className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-300">{label}</span>
        </label>
    );
}


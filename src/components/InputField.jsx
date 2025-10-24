// File: src/components/InputField.jsx
import React from 'react';
export default function InputField({ label, name, type = 'text', value, onChange, required = false, disabled = false }) {
    return (
        <div>
            <label htmlFor={name} className="block text-sm font-medium text-gray-300 mb-1">{label} {required && '*'}</label>
            <input
                type={type}
                name={name}
                id={name}
                value={value}
                onChange={onChange}
                required={required}
                disabled={disabled}
                className="w-full p-2 bg-gray-700 text-white rounded-md border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed"
            />
        </div>
    );
}


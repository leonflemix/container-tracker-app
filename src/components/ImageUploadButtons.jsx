// File: src/components/ImageUploadButtons.jsx
// Location: src/components

import React from 'react';
import { CameraIcon, UploadIcon } from '../icons'; // <-- BUG FIX: Import from central icons file

// Renders hidden file inputs and two buttons to trigger them.
// Props:
//   scanInputRef, uploadInputRef - refs forwarded from parent
//   onFileChange - handler for input change
//   disabled - boolean
export default function ImageUploadButtons({ scanInputRef, uploadInputRef, onFileChange, disabled }) {
    return (
        <div className="flex gap-2">
            <input type="file" ref={scanInputRef} onChange={onFileChange} className="hidden" accept="image/*" capture="environment" />
            <input type="file" ref={uploadInputRef} onChange={onFileChange} className="hidden" accept="image/*" />
            <button type="button" onClick={() => scanInputRef.current && scanInputRef.current.click()} disabled={disabled} className="flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg" title="Scan with Camera">
                <CameraIcon />
            </button>
            <button type="button" onClick={() => uploadInputRef.current && uploadInputRef.current.click()} disabled={disabled} className="flex items-center justify-center bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg" title="Upload Image">
                <UploadIcon />
            </button>
        </div>
    );
}

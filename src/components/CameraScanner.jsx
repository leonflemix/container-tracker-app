// File: src/components/CameraScanner.jsx
// Location: src/components

/* global Tesseract */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useToasts } from '../hooks/useToasts';
import { CameraIcon } from '../icons';

export default function CameraScanner({ onScanComplete, onCancel }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [isLoading, setIsLoading] = useState(false);
    const [stream, setStream] = useState(null);
    const { addToast } = useToasts();

    const startCamera = useCallback(async () => {
        // Check for HTTPS connection which is required for camera access on mobile
        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
            addToast('Camera access requires a secure (HTTPS) connection.', 'error');
            onCancel();
            return;
        }

        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' } // Prefer the rear camera
            });
            setStream(mediaStream);
        } catch (err) {
            console.error("Error accessing camera:", err);
            addToast('Could not access camera. Please check permissions.', 'error');
            onCancel();
        }
    }, [addToast, onCancel]);
    
    // This effect ensures the stream is attached only after the video element is ready.
    useEffect(() => {
        if (stream && videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    // Cleanup function to stop the camera stream when the component unmounts
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

    const handleCapture = async () => {
        if (!videoRef.current || !stream) {
            addToast('Camera stream not available.', 'error');
            return;
        }

        // Add a check to ensure the Tesseract script has loaded onto the window object.
        if (typeof window.Tesseract === 'undefined') {
            addToast("OCR script is still loading. Please wait a moment and try again.", 'error');
            return;
        }

        setIsLoading(true);

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        
        try {
            // Explicitly use window.Tesseract to avoid build errors.
            const { data: { text } } = await window.Tesseract.recognize(
                canvas,
                'eng',
                { logger: m => console.log(m) }
            );
            onScanComplete(text);
        } catch (error) {
            console.error("OCR Error:", error);
            addToast("Could not recognize text. Please try again.", 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    if (!stream) {
        return (
             <div className="fixed inset-0 bg-black bg-opacity-90 flex flex-col justify-center items-center z-[60] p-4">
                <div className="text-center">
                    <p className="text-white mb-4">Camera access is required to scan.</p>
                    <button 
                        onClick={startCamera}
                        className="flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg"
                    >
                        <CameraIcon />
                        Start Camera
                    </button>
                     <button onClick={onCancel} className="mt-4 py-2 px-6 bg-gray-600 hover:bg-gray-700 rounded-lg text-white">
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex flex-col justify-center items-center z-[60] p-4">
            <div className="relative w-full max-w-2xl aspect-video bg-gray-900 rounded-lg overflow-hidden">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
                <canvas ref={canvasRef} className="hidden"></canvas>
                {isLoading && (
                    <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col justify-center items-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white"></div>
                        <p className="text-white mt-4">Processing Image...</p>
                    </div>
                )}
            </div>
            <div className="mt-4 flex gap-4">
                <button 
                    onClick={handleCapture} 
                    disabled={isLoading}
                    className="py-2 px-6 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-bold disabled:bg-blue-800"
                >
                    Capture
                </button>
                <button onClick={onCancel} className="py-2 px-6 bg-gray-600 hover:bg-gray-700 rounded-lg text-white">
                    Cancel
                </button>
            </div>
        </div>
    );
}


// File: src/components/CameraScanner.jsx
// Location: src/components

import React, { useState, useRef, useEffect } from 'react';
import { useToasts } from '../hooks/useToasts';

export default function CameraScanner({ onScanComplete, onCancel }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [isScanning, setIsScanning] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useToasts();

    useEffect(() => {
        const startCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' } // Prefer the rear camera
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
                addToast('Could not access camera. Please check permissions.', 'error');
                onCancel();
            }
        };

        startCamera();

        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
        };
    }, [addToast, onCancel]);

    const handleCapture = async () => {
        if (!videoRef.current) return;
        setIsLoading(true);

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        // Set canvas dimensions to match the video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw the current video frame onto the canvas
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        
        // Use Tesseract to recognize text from the canvas image
        try {
            const { data: { text } } = await Tesseract.recognize(
                canvas,
                'eng',
                {
                    logger: m => console.log(m) // Optional: log progress
                }
            );
            onScanComplete(text);
        } catch (error) {
            console.error("OCR Error:", error);
            addToast("Could not recognize text. Please try again.", 'error');
        } finally {
            setIsLoading(false);
        }
    };

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

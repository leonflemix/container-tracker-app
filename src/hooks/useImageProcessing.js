import { useState } from 'react';
import { fileToBase64, parseOcrText } from '../utils/ocr';
import { extractTextFromImage } from '../services/geminiService';

// Hook to process an image file with Gemini, then parse OCR fields.
// Usage: const { isProcessing, processFile } = useImageProcessing({ addToast });
export default function useImageProcessing({ addToast }) {
    const [isProcessing, setIsProcessing] = useState(false);

    const processFile = async (file) => {
        if (!file) return null;

        const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
        if (!apiKey) {
            addToast("Gemini API key is not configured.", 'error');
            return null;
        }

        setIsProcessing(true);
        addToast("Processing image with Gemini...", "info");

        try {
            const base64 = await fileToBase64(file);
            const text = await extractTextFromImage(base64, file.type, apiKey);
            if (!text) {
                throw new Error('No text extracted');
            }
            const parsed = parseOcrText(text.trim());
            // Report messages for user feedback
            parsed.messages.forEach(msg => {
                if (msg.startsWith('Found')) addToast(msg, 'success'); else addToast(msg, 'error');
            });
            return parsed;
        } catch (err) {
            addToast(err.message || "Image processing failed", 'error');
            console.error('Image processing error:', err);
            return null;
        } finally {
            setIsProcessing(false);
        }
    };

    return { isProcessing, processFile };
}
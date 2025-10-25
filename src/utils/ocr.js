// Helpers for OCR parsing & basic file -> base64 conversion
export const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = (error) => reject(error);
    });

// Parse the text extracted from the image to find container ID and tare weight.
// Returns an object { id, tareWeight, messages: [] }
export const parseOcrText = (text = '') => {
    const messages = [];
    const containerIdMatch = text.match(/([A-Z]{4})\s*(\d{6})\s*(\d)/);
    const tareMatch = text.match(/TARE[\s\S]*?(\d{1,3}[.,]?\d{3})\s*KGS/i);

    let id = null;
    if (containerIdMatch && containerIdMatch[1] && containerIdMatch[2] && containerIdMatch[3]) {
        id = `${containerIdMatch[1]}${containerIdMatch[2]}${containerIdMatch[3]}`;
        messages.push(`Found Container ID: ${id}`);
    } else {
        messages.push('Could not find a valid Container ID (Format: XXXU1234567).');
    }

    let tareWeight = null;
    if (tareMatch && tareMatch[1]) {
        // Normalize decimal groupers
        tareWeight = parseInt(tareMatch[1].replace(/[.,]/g, ''), 10);
        if (!Number.isNaN(tareWeight)) {
            messages.push(`Found Tare Weight: ${tareWeight} KGS`);
        } else {
            tareWeight = null;
            messages.push('Tare weight parsed but invalid number.');
        }
    } else {
        messages.push('Could not find Tare Weight in KGS.');
    }

    return { id, tareWeight, messages };
};
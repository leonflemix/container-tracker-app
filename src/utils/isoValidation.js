// File: src/utils/isoValidation.js

// Map alphanumeric characters to their ISO 6346 values
const charMap = {
    'A': 10, 'B': 12, 'C': 13, 'D': 14, 'E': 15, 'F': 16, 'G': 17, 'H': 18, 'I': 19, 'J': 20, 'K': 21,
    'L': 23, 'M': 24, 'N': 25, 'O': 26, 'P': 27, 'Q': 28, 'R': 29, 'S': 30, 'T': 31, 'U': 32, 'V': 34,
    'W': 35, 'X': 36, 'Y': 37, 'Z': 38,
    '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9
};

export function validateContainerId(id) {
    if (!id || typeof id !== 'string') return { isValid: false, error: 'Empty ID' };
    
    // Clean and standard format: 4 letters + 7 numbers
    const cleanId = id.toUpperCase().trim();
    const regex = /^[A-Z]{4}\d{7}$/;

    if (!regex.test(cleanId)) {
        return { isValid: false, error: 'Format must be 4 letters followed by 7 numbers (e.g., ABCD1234567)' };
    }

    // Check digit calculation
    let sum = 0;
    for (let i = 0; i < 10; i++) {
        const char = cleanId[i];
        const val = charMap[char];
        // Multiply by 2^i
        sum += val * Math.pow(2, i);
    }

    const remainder = sum % 11;
    // Check digit is the remainder, unless it's 10, then it's 0 (technically mod 11=10 is invalid in ISO 6346, often represented as 0 in some systems, but strict ISO says digit must be 0-9. If calc result is 10, check digit should be 0)
    // Actually, ISO 6346 says: "If the remainder is 10, the check digit is 0". 
    // Wait, strictly speaking, a remainder of 10 is impossible for a valid container number according to some interpretations, but standard practice handles it as 0.
    const checkDigitCalc = remainder === 10 ? 0 : remainder;

    const checkDigitActual = parseInt(cleanId[10], 10);

    if (checkDigitCalc !== checkDigitActual) {
        return { 
            isValid: false, 
            error: `Invalid Check Digit. Expected ${checkDigitCalc}, found ${checkDigitActual}.` 
        };
    }

    return { isValid: true, error: null };
}
// File: src/services/geminiService.js
// Location: src/services

// Minimal wrapper for calling the Gemini generative language API with retries.
// Returns extracted text (string) or throws.
export async function extractTextFromImage(base64Data, mimeType, apiKey, maxRetries = 3) {
    if (!apiKey) throw new Error('Gemini API key not configured');

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    const payload = {
        contents: [
            {
                parts: [
                    { text: "Extract all visible text from the image of the container door. Preserve the original line breaks." },
                    { inlineData: { mimeType, data: base64Data } }
                ]
            }
        ]
    };

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const resp = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!resp.ok) {
                // Retry on rate limit / server errors
                if (resp.status === 429 || resp.status >= 500) {
                    const backoff = 1000 * Math.pow(2, attempt);
                    await new Promise(r => setTimeout(r, backoff));
                    continue;
                }
                const body = await resp.text().catch(() => resp.statusText);
                throw new Error(`Gemini API error: ${body}`);
            }
            const json = await resp.json();
            const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) {
                const safety = json.candidates?.[0]?.finishReason || json.promptFeedback?.blockReason;
                throw new Error(safety ? `Gemini returned: ${safety}` : 'Gemini returned no text');
            }
            return text;
        } catch (err) {
            if (attempt === maxRetries - 1) throw err;
            // exponential backoff then retry
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        }
    }
    throw new Error('Gemini API failed after retries');
}

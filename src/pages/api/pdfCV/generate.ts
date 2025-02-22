// src/api/pdfApi.ts
export const convertLatexToPdf = (() => {
    let lastCall = 0;

    return async (latex: string): Promise<Blob | null> => {
        const now = Date.now();
        if (now - lastCall < 5000) {
            console.warn('API call is rate-limited. Please wait.');
            return null;
        }
        lastCall = now;

        try {
            const response = await fetch('http://100.69.4.2:3005/convert', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ latex: latex.toString() }),
            });
            if (response.ok) {
                return await response.blob();
            } else {
                console.error('Failed to convert LaTeX to PDF');
                return null;
            }
        } catch (error) {
            console.error('Error:', error);
            return null;
        }
    };
})();

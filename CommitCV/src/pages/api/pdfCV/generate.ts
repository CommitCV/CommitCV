export const convertLatexToPdf = (() => {
    let lastCall = 0;
    const apiEndpoint = process.env.NEXT_PUBLIC_PDF_ENDPOINT;

    return async (latex: string): Promise<Blob | null> => {
        const now = Date.now();
        if (now - lastCall < 5000) {
            console.warn('API call is rate-limited. Please wait.');
            return null;
        }
        lastCall = now;

        if (!apiEndpoint) {
            console.log('PDF_ENDPOINT is not set');
            return null;
        }

        try {
            const response = await fetch(apiEndpoint, {
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
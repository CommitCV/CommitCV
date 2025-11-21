export const convertLatexToPdf = (() => {
    const apiEndpoint = process.env.NEXT_PUBLIC_PDF_ENDPOINT;

    return async (latex: string): Promise<Blob> => {
        if (!apiEndpoint) {
            throw new Error('PDF_ENDPOINT is not set. Please configure NEXT_PUBLIC_PDF_ENDPOINT in your .env file.');
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
                const errorText = await response.text().catch(() => 'Unknown error');
                throw new Error(`Failed to convert LaTeX to PDF: ${response.status} ${response.statusText}. ${errorText}`);
            }
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error(`Network error while generating PDF: ${error}`);
        }
    };
})();
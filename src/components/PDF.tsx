"use client"
import { Document, Page, pdfjs } from "react-pdf";
import { useState } from "react";
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

interface IPDF {
    file: string;
}

pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.mjs`;

export default function PDF({ file }: IPDF) {
    const [numPages, setNumPages] = useState<number>();

    function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
        setNumPages(numPages);
    }

    return (
        <div style={{ overflowY: 'scroll', height: '100vh' }}>
            <Document file={file} onLoadSuccess={onDocumentLoadSuccess}>
                {Array.from(new Array(numPages), (el, index) => (
                    <Page key={`page_${index + 1}`} pageNumber={index + 1} />
                ))}
            </Document>
        </div>
    );
}

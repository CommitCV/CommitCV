"use client"
import dynamic from 'next/dynamic';
import { Document, Page, pdfjs } from "react-pdf";
import { useState } from "react";
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { GlobalWorkerOptions } from "pdfjs-dist";
// @ts-expect-error not fixing for old version ;-;
import { WorkerMessageHandler } from "pdfjs-dist/build/pdf.worker.min.mjs";

GlobalWorkerOptions.workerSrc = new URL(
    WorkerMessageHandler,
    import.meta.url
).toString();

interface IPDF {
    file: string;
}

function PDFComponent({ file }: IPDF) {
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

const PDF = dynamic(() => Promise.resolve(PDFComponent), { ssr: false });

export default PDF;
"use client"
import Header from "@/components/Header";
import ResumeEditor from "@/components/ResumeEditor";
import { useCallback, useState, useEffect, useRef } from "react";
import { Resume } from "@/data/types/Resume";
import { useFile } from "@/data/context/FileContext";
import { convertLatexToPdf } from "@/pages/api/pdfCV/generate";
import PDF from "@/components/PDF";
import { ResumeToLatex }  from "@/data/ResumeToLatex"

export default function ResumeHome() {
    const { fileData } = useFile();
    const [resume, setResume] = useState<Resume | null>(null);
    const [useTemplateJson, setUseTemplateJson] = useState(true);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Get user's file if provided
        if (fileData) {
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const jsonData: Resume = JSON.parse(reader.result as string);
                    setResume(jsonData);
                    setUseTemplateJson(false);
                    generatePdf();
                } catch (error) {
                    console.error("Error reading JSON file", error);
                    setUseTemplateJson(true); // fallback to template if JSON parsing fails
                }
            };
            reader.readAsText(fileData);

        // Fetch template.json data in Home
        } else if (useTemplateJson) {
            fetch("/template.json")
                .then((res) => res.json())
                .then((data) => {
                    setResume(data);
                    setUseTemplateJson(false); // Switch off template usage once data is loaded
                    generatePdf();
                })
                .catch((err) => console.error("Failed to load resume template", err));
        }
    }, [fileData, useTemplateJson]);

    const generatePdf = useCallback(async () => {
        if (resume) {
            try {
                const latex = ResumeToLatex(resume);
                const blob = await convertLatexToPdf(latex);
                if (blob) {
                    const url = URL.createObjectURL(blob);
                    setPdfUrl(url);
                } else {
                    console.error("PDF Blob is null");
                }
            } catch (error) {
                console.error("Error generating PDF:", error);
            }
        }
    }, [resume, setPdfUrl]); // Use resume to regenerate PDF when data changes

    useEffect(() => {
        // Clear any existing timeout to debounce call
        if(timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // set a new timeout to trigger PDF generation
        timeoutRef.current = setTimeout(() => {
            generatePdf();
        }, 1200);

        return () => {
            if(timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [resume, generatePdf]);


    const handleDownload = () => {
        if (pdfUrl) {
            const link = document.createElement("a");
            link.href = pdfUrl;
            link.download = "resume.pdf"; // Set the desired filename
            link.click();
        }
    };
    
    const handleDownloadJson = () => {
            const json = JSON.stringify(resume, null, 2);
            const blob = new Blob([json], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = "resume.json";
            link.click();
        };


    return (
        <div>
            <Header />
            <div className="grid grid-cols-2">
                    <div className="container mx-auto">
                        <ResumeEditor resume={resume} setResume={setResume}/>
                    </div>
                <div className="flex flex-row justify-start items-start gap-4">
                    {pdfUrl && <PDF file={pdfUrl} />}
                    <div className="flex flex-col justify-start">
                        {pdfUrl && (
                            <>
                                <button
                                    onClick={handleDownload}
                                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-2" // Added mb-2
                                >
                                    Download Resume
                                </button>
                                <button
                                    onClick={handleDownloadJson}
                                    className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                                >
                                    Download JSON
                                </button>
                            </>
                        )}
                        {!pdfUrl && <div>No PDF Available</div>}
                    </div>
                </div>
            </div>
        </div>
    );
}

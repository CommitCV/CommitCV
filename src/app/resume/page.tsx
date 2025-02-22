"use client";
import { useEffect, useState, useCallback } from "react";
import { useFile } from "@/context/FileContext";
import HeaderCard from "@/components/HeaderCard";
import PDF from "@/components/PDF";
import SectionCard from "@/components/SectionCard";
import { GenerateLatex } from "@/resume/ResumeGenerator";
import { convertLatexToPdf } from "@/pages/api/pdfCV/generate";
import { BulletCollection, ParagraphCollection, Subsection } from "@/resume/ResumeComponents";

interface HeaderObject {
    text: string;
    link?: string;
    onTextChange: (text: string) => void;
    onLinkChange: (link: string) => void;
}

interface Section {
    name: string;
    headerCards?: HeaderObject[];
    subsections?: Subsection[];
    bulletCollection?: BulletCollection;
    paragraphCollection?: ParagraphCollection;
}

export interface ResumeData {
    Header: {
        name: string;
        HeaderObject: HeaderObject[];
    };
    Sections: Section[];
}

export default function Resume() {
    const { fileData } = useFile();
    const [fileContent, setFileContent] = useState<string | null>(null);
    const [jData, setJData] = useState<ResumeData | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [fileProcessed, setFileProcessed] = useState(false);
    const [useTemplateJson, setUseTemplateJson] = useState(false);

    console.log("Rendering Latex");

    useEffect(() => {
        if (fileData && fileData.path) {
            const reader = new FileReader();
            reader.onload = () => {
                setFileContent(reader.result as string);
                setFileProcessed(false);
            };
            reader.onerror = () => {
                console.error("Error reading file");
            };
            reader.readAsText(fileData);
        } else if (!fileData) {
            setUseTemplateJson(true);
        }
    }, [fileData]);

    useEffect(() => {
        if (fileContent && !fileProcessed) {
            console.log("Initializing JData");
            try {
                const parsedData: ResumeData = JSON.parse(fileContent);
                const headerSection: Section = {
                    name: parsedData.Header.name,
                    headerCards: parsedData.Header.HeaderObject.map((header: HeaderObject) => ({
                        text: header.text,
                        link: header.link,
                        onTextChange: () => { },
                        onLinkChange: () => { }
                    }))
                };
                parsedData.Sections.unshift(headerSection);
                setJData(parsedData);
                setFileProcessed(true);
                setUseTemplateJson(false);
            } catch (error) {
                console.error("Error parsing JSON:", error);
                setUseTemplateJson(true);
            }
        }
    }, [fileContent, fileProcessed]);

    useEffect(() => {
        if (useTemplateJson) {
            fetch("/template.json")
                .then((response) => response.json())
                .then((templateData: ResumeData) => {
                    const headerSection: Section = {
                        name: templateData.Header.name,
                        headerCards: templateData.Header.HeaderObject.map((header: HeaderObject) => ({
                            text: header.text,
                            link: header.link,
                            onTextChange: () => { },
                            onLinkChange: () => { }
                        }))
                    };
                    templateData.Sections.unshift(headerSection);
                    setJData(templateData);
                })
                .catch((error) => {
                    console.error("Error fetching template JSON:", error);
                });
        }
    }, [useTemplateJson]);

    const generatePdf = useCallback(async () => {
        if (jData) {
            try {
                const latex = GenerateLatex(jData);
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
    }, [jData]);

    useEffect(() => {
        generatePdf();
    }, [jData, generatePdf]);

    if (!jData && !useTemplateJson) {
        return <div>Loading...</div>;
    }

    console.log(jData);

    const handleDownload = () => {
        if (pdfUrl) {
            const link = document.createElement("a");
            link.href = pdfUrl;
            link.download = "resume.pdf"; // Set the desired filename
            link.click();
        }
    };

    const handleDownloadJson = () => {
            if (jData) {
                const json = JSON.stringify(jData, null, 2);
                const blob = new Blob([json], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = "resume.json";
                link.click();
            }
        };


    return (
        <div>
            <HeaderCard />
            <div className="grid grid-cols-2">
                <div className="flex flex-col gap-8 px-8 pt-4">
                    {jData &&
                        jData.Sections.map((section, index) => (
                            <SectionCard
                                key={index}
                                name={section.name}
                                headerCards={section.headerCards}
                                subsections={section.subsections}
                                bulletCollection={section.bulletCollection}
                                paragraphCollection={section.paragraphCollection}
                                setJData={setJData}
                            />
                        ))}
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

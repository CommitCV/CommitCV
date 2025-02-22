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

    useEffect(() => {
        if (fileData && fileData.path) {
            const reader = new FileReader();
            reader.onload = () => {
                setFileContent(reader.result as string);
            };
            reader.onerror = () => {
                console.error("Error reading file");
            };
            reader.readAsText(fileData);
        }
    }, [fileData]);

    useEffect(() => {
        if (fileContent) {
            const parsedData: ResumeData = JSON.parse(fileContent);
            const headerSection: Section = {
                name: parsedData.Header.name,
                headerCards: parsedData.Header.HeaderObject.map((header: HeaderObject) => ({
                    text: header.text,
                    link: header.link
                }))
            };
            parsedData.Sections.unshift(headerSection);
            setJData(parsedData);
        }
    }, [fileContent]);

    const generatePdf = useCallback(async () => {
        if (jData) {
            const latex = GenerateLatex(jData);
            const blob = await convertLatexToPdf(latex);
            if (blob) {
                const url = URL.createObjectURL(blob);
                setPdfUrl(url);
            }
        }
    }, [jData]);

    useEffect(() => {
        generatePdf();
    }, [jData, generatePdf]);

    if (!jData || !pdfUrl) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <HeaderCard />
            <div className="grid grid-cols-2">
                <div className="flex flex-col gap-8 px-8 pt-4">
                    {jData.Sections.map((section, index) => (
                        <SectionCard
                            key={index}
                            name={section.name}
                            headerCards={section.headerCards}
                            subsections={section.subsections}
                            bulletCollection={section.bulletCollection}
                            paragraphCollection={section.paragraphCollection}
                            setJData={setJData} // Pass setter function
                        />
                    ))}
                </div>
                <div>
                    <PDF file={pdfUrl} />
                </div>
            </div>
        </div>
    );
}
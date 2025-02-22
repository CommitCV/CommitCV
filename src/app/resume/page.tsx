"use client"
import HeaderCard from "@/components/HeaderCard";
import PDF from "@/components/PDF";
import { useFile } from "@/context/FileContext";
import { useEffect, useState } from "react";
import SectionCard from "@/components/SectionCard";
import { BulletCollection, ParagraphCollection, Subsection } from "@/resume/ResumeComponents";
import { GenerateLatex } from "@/resume/ResumeGenerator";

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

interface ResumeData {
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
                name: "Contact Information",
                headerCards: parsedData.Header.HeaderObject.map((header: HeaderObject) => ({
                    text: header.text,
                    link: header.link
                }))
            };
            parsedData.Sections.unshift(headerSection);
            setJData(parsedData);
        }
    }, [fileContent]);

    useEffect(() => {
        const generatePdf = async () => {
            if (jData) {
                const latex = GenerateLatex(jData);
                try {
                    const response = await fetch('http://localhost:3005/convert', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ latex: latex.toString() }), // Ensure latex is a string
                    });
                    if (response.ok) {
                        const blob = await response.blob();
                        const url = URL.createObjectURL(blob);
                        setPdfUrl(url);
                    } else {
                        console.error('Failed to convert LaTeX to PDF');
                    }
                } catch (error) {
                    console.error('Error:', error);
                }
            }
        };
        generatePdf();
    }, [jData]);

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
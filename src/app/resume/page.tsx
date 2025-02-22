"use client"
import HeaderCard from "@/components/HeaderCard";
import PDF from "@/components/PDF";
import { useFile } from "@/context/FileContext";
import { useEffect, useState } from "react";
import { Header as ResumeHeader } from "@/resume/ResumeComponents";
import SectionCard from "@/components/SectionCard";

interface HeaderObject {
    text: string;
    link?: string;
}

interface Section {
    name: string;
    headerCards?: HeaderObject[];
    subsections?: any[]; // Replace `any` with the appropriate type if available
    bulletCollection?: any; // Replace `any` with the appropriate type if available
    paragraphCollection?: any; // Replace `any` with the appropriate type if available
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

    if (!jData) {
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
                    <PDF />
                </div>
            </div>
        </div>
    );
}
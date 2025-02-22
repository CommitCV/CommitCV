"use client"
import HeaderCard from "@/components/HeaderCard";
import PDF from "@/components/PDF";
import FileUpload from "@/components/FileUpload";
import { useFile } from "@/context/FileContext";
import { useEffect, useState } from "react";
import { Header as ResumeHeader } from "@/resume/ResumeComponents";
import SectionCard from "@/components/SectionCard";

export default function Resume() {

    const file: string = `{
        "Header": {
            "name": "Connor Langan",
            "HeaderObject": [
                {
                    "text": "connorlangan@gmail.com"
                },
                {
                    "text": "420-69-9999"
                },
                {
                    "text": "github.com/cjlangan",
                    "link": "https://github.com/cjlangan"
                }
            ]
        },
        "Sections": [
            {
                "name": "Education",
                "subsections": [
                    {
                        "title": "University of Manitoba",
                        "date": "Sep. 2023 -- Present",
                        "subtitle": "Bachelor of Science in Computer Science (Honours), Minor in Mathematics",
                        "location": "Winnipeg, MB",
                        "bulletCollection": {
                            "bullets": [
                                { "normal": "GPA: 4.45 / 4.5, Honours and entering Co-op program Winter 2025" },
                                { "normal": "Relevant Courses: Data Structures and Algorithms, Object Orientation, Computer Systems" }
                            ]
                        }
                    }
                ]
            },
            {
                "name": "Work Experience",
                "subsections": [
                    {
                        "title": "Supervisor/Lifeguard/Water Safety Instructor",
                        "date": "June 2020 -- August 2024",
                        "subtitle": "Louise Recreation Commission",
                        "location": "Pilot Mound, MB",
                        "bulletCollection": {
                            "bullets": [
                                { "normal": "Led pool operations, including scheduling, water quality maintenance, and staff training" },
                                { "normal": "Instructed water safety and swimming skills to various skill levels, enhancing community safety" }
                            ]
                        }
                    }
                ]
            },
            {
                "name": "Volunteer Experience",
                "subsections": [
                    {
                        "title": "Dev Club Hackathon | Mentor",
                        "date": "2025",
                        "bulletCollection": {
                            "bullets": [
                                { "normal": "Provided administrative support by enrolling 100+ competitors and managing event logistics" },
                                { "normal": "Guided participants through technical challenges, fostering innovation and problem-solving skills" }
                            ]
                        }
                    },
                    {
                        "title": "Instructor/Lecturer | Dev Club Exam Cram",
                        "date": "2024",
                        "bulletCollection": {
                            "bullets": [
                                { "normal": "Delivered an engaging lecture on Analysis of Algorithms to 20 2nd-year students" },
                                { "normal": "Developed comprehensive study materials, enhancing students' understanding of complex concepts" }
                            ]
                        }
                    }
                ]
            },
            {
                "name": "Projects",
                "subsections": [
                    {
                        "title": "FriendLocator: Geolocation Social App",
                        "date": "2025",
                        "subtitle": "SQLite, Python, Flask, JavaScript",
                        "location": "Manitoba",
                        "bulletCollection": {
                            "bullets": [
                                { "normal": "Engineered a self-hosted server with real-time location sharing and direction" },
                                { "normal": "Secured 2nd Place in the Robobisons Competition for innovative application of geolocation technology" }
                            ]
                        }
                    },
                    {
                        "title": "HomeServer: Adblock and Data Storage",
                        "date": "2025",
                        "location": "Manitoba",
                        "subtitle": "Site Hosting, Remote, Headless",
                        "bulletCollection": {
                            "bullets": [
                                { "normal": "Configured a headless Home Server running 24/7, accessible remotely when using VPN" },
                                { "normal": "Initiated network-wide adblock, family data storage and media share capabilities" },
                                { "normal": "Hosting project websites such as friend-locator.duckdns.org" }
                            ]
                        }
                    },
                    {
                        "title": "VoiceCompanion: Raspberry Pi AI Assistant",
                        "date": "2025",
                        "location": "Manitoba",
                        "subtitle": "Bash, Text-to-Speech, Speech-to-Text",
                        "bulletCollection": {
                            "bullets": [
                                { "normal": "Engineered an AI assistant for natural language processing" },
                                { "normal": "Implemented text-to-speech and speech-to-text capabilities for seamless interaction" },
                                { "normal": "Optimized performance for Raspberry Pi, achieving real-time responses without external APIs" }
                            ]
                        }
                    },
                    {
                        "title": "WebChess: AI Chess Game",
                        "date": "Ongoing",
                        "subtitle": "JavaScript, Object-Oriented Programming",
                        "location": "Online",
                        "bulletCollection": {
                            "bullets": [
                                { "normal": "Developed a fully functional chess game with an intuitive user interface" },
                                { "normal": "Implemented complex game logic and move validation using object-oriented principles" },
                                { "normal": "Designing an AI opponent using minimax algorithm with alpha-beta pruning" }
                            ]
                        }
                    }
                ]
            },
            {
                "name": "Awards",
                "bulletCollection": {
                    "bullets": [
                        { "normal": "Highschool Average of 98; Valedictorian" },
                        { "normal": "Work Ethic and Community Volunteer Scholarship" },
                        { "normal": "Governor General Academic Medal" },
                        { "normal": "MHSAA Credit Union Scholar-Athlete Certificate" },
                        { "normal": "Boundary Co-op Scholarship for Academic Standing" },
                        { "normal": "Askew Memorial Scholarship; Highest Academic Standing" }
                    ]
                }
            },
            {
                "name": "Technical Skills",
                "paragraphCollection": {
                    "paragraphs": [
                        { "bold": "Languages:", "normal": "C, C++, SQL, Java, Rust, JavaScript, Python, R, Bash, HTML/CSS" },
                        { "bold": "Tools and Technologies:", "normal": "Git, Unix, Vim, Docker, LaTeX, Flask, React, Node.js, SQL" }
                    ]
                }
            },
            {
                "name": "Activities and Interests",
                "paragraphCollection": {
                    "paragraphs": [
                        { "bold": "YouTuber:", "normal": "Manage a channel with 6500+ subscribers and 2.6M+ views, featuring parameter modification hacking" },
                        { "bold": "Linux Enthusiast:", "normal": "Daily drive Arch Linux, constantly exploring and customizing advanced system configurations" }
                    ]
                }
            }
        ]
    }`

    const jData = JSON.parse(file)

    const objArray: ResumeHeader[] = [];

    for(const key of Object.keys(jData.Header.HeaderObject)) {
        const obj = jData.Header.HeaderObject[key];
        console.log(obj)

        if (obj) {
            objArray.push(obj);
        }
    }

    // Create a new section from the HeaderObject
    const headerSection = {
        name: jData.Header.name,
            headerCards: jData.Header.HeaderObject.map((header: any) => ({
                text: header.text,
                link: header.link
            }))
    };

    console.log(headerSection)
export default function Resume() {
    const { fileData } = useFile();
    const [fileContent, setFileContent] = useState<string | null>(null);

    // Add the new section to the Sections array
    jData.Sections.unshift(headerSection);

    useEffect(() => {
        if (fileData && fileData.path) {
            // Read the file's content if the file data exists
            const reader = new FileReader();
            reader.onload = () => {
                setFileContent(reader.result as string); // Store the file content
            };
            reader.onerror = () => {
                console.error("Error reading file");
            };

            reader.readAsText(fileData); // Read the file as text
        }
    }, [fileData]);

    return (
        <div>
            <HeaderCard/>
            <div className={`grid grid-cols-2`}>
                <div className={`flex flex-col gap-8 px-8 pt-4`}>
                    {jData.Sections.map((section: any, index: number) => (
                        <SectionCard key={index} name={section.name} headerCards={section.headerCards} subsections={section.subsections} bulletCollection={section.bulletCollection} paragraphCollection={section.paragraphCollection} />
                    ))}
                </div>
                <div>
                    <PDF/>
                </div>
            </div>
        </div>
    );
}

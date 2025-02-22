"use client";

import Header from "@/components/Header";
import SectionCard from "@/components/SectionCard";
import PDF from "@/components/PDF";
import FileUpload from "@/components/FileUpload";
import { useFile } from "@/context/FileContext";
import { useEffect, useState } from "react";

export default function Resume() {
    const { fileData } = useFile();
    const [fileContent, setFileContent] = useState<string | null>(null);

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
            <Header />
            <div className="grid grid-cols-2">
                <div>
                    <SectionCard />
                    <FileUpload />
                </div>
                {fileContent ? (
                    <pre>{fileContent}</pre> // Display the content of the file
                ) : (
                    <p>No file data uploaded</p>
                )}
                <div>
                    <PDF />
                </div>
            </div>
        </div>
    );
}


{/*<h1>Welcome</h1>*/}
{/*<button onClick={handleLogin}>Sign in with GitHub</button>*/}
{/*<button onClick={handleLogout}>Logout</button>*/}
{/*<button onClick={handleInstall}>Install GitHub App</button>*/}
{/*<Link href="/resume">Go to Protected Page</Link>*/}


// const handleLogin = () => {
//     router.push("/api/github/login");
// };
//
// const handleLogout = () => {
//     router.push("/api/github/logout");
// };
//
// const handleInstall = () => {
//     window.location.href = `https://github.com/apps/commitcv/installations/new`;
// }

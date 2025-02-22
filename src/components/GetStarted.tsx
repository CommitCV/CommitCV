"use client";

import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { useFile } from "@/context/FileContext";
import { useEffect } from "react";

export default function GetStarted() {
    const { acceptedFiles, getRootProps, getInputProps } = useDropzone();
    const { setFileData } = useFile(); // Use the context to set file data
    const router = useRouter();

    const files = acceptedFiles.map(file => (
        <li key={file.path}>
            {file.path} - {file.size} bytes
        </li>
    ));

    // Watch for accepted files and trigger the file upload
    useEffect(() => {
        if (acceptedFiles.length > 0) {
            console.log("File uploaded, redirecting...");
            setFileData(acceptedFiles[0]); // Set the uploaded file to context
            router.push("/resume"); // Redirect to /resume page
        }
    }, [acceptedFiles, setFileData, router]); // Effect depends on acceptedFiles

    return (
        <div className={`grid grid-rows-1 grid-cols-2`}>
            <div className={`bg-gray-200 rounded-2xl w-[30vw] h-[30vw] m-auto`}>
                <h1 className={`text-4xl`}>Start a new resume!</h1>
                <button>Click Here</button>
            </div>
            <div className={`bg-gray-200 rounded-2xl w-[30vw] h-[30vw] m-auto`}>
                <h1 className={`text-4xl`}>I already have a file</h1>
                <section className="w-container bg-gray-400">
                    <div {...getRootProps({ className: "dropzone w-full h-full" })}>
                        <input {...getInputProps()} />
                        <p>Drag 'n' drop some files here, or click to select files</p>
                    </div>
                    <aside>
                        <h4>Files</h4>
                        <ul>{files}</ul>
                    </aside>
                </section>
            </div>
        </div>
    );
}

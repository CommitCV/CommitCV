"use client";

import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { useFile } from "@/context/FileContext";
import { useEffect } from "react";
import Link from 'next/link';

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
    <div className={`flex justify-center items-center h-screen`}>
      <div className={`grid grid-rows-1 grid-cols-2 gap-2 p-4 w-fit`}>
        <div className={`bg-gray-200 rounded-2xl shadow-lg w-full max-w-[30vw] h-auto p-6 flex flex-col items-center justify-center`}>
          <h1 className={`text-2xl font-semibold mb-4 text-center`}>Start a new resume!</h1>
          <Link href="/resume/"> {/* Use Link component */}
            <button className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded`}>
              Click Here
            </button>
          </Link>
        </div>
        <div className={`bg-gray-200 rounded-2xl shadow-lg w-full max-w-[30vw] h-auto p-6 flex flex-col`}>
          <h1 className={`text-2xl font-semibold mb-4 text-center`}>I already have a file</h1>
          <section className="w-full bg-gray-100 rounded-lg p-4">
            <div {...getRootProps({ className: "dropzone w-full h-32 border-2 border-dashed border-gray-400 rounded-lg flex items-center justify-center text-center" })}>
              <input {...getInputProps()} />
              <p className="text-gray-600">Drag 'n' drop some files here, or click to select files</p>
            </div>
            <aside className="mt-4">
              <h4 className="font-semibold mb-2">Files</h4>
              <ul>{files}</ul>
            </aside>
          </section>
        </div>
      </div>
    </div>
  );
}

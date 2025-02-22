"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const UploadButton = ({ setFileData }: { setFileData: (data: any) => void }) => {
    const uploadRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            const file = event.target.files[0];

            if (file.type !== "application/json") {
                alert("Please upload a .json file");
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                if (e.target && e.target.result) {
                    try {
                        const fileContent = e.target.result as string;
                        const jsonFile = JSON.parse(fileContent);

                        setFileData(jsonFile); // Store data in state instead of URL
                        router.push("/resume"); // Navigate without passing the data in the URL
                    } catch (error) {
                        console.error("Error parsing JSON file:", error);
                        alert("Invalid JSON file.");
                    }
                }
            };
            reader.readAsText(file);
        }
    };

    return (
        <div>
            <button onClick={() => uploadRef.current?.click()}>Upload File</button>
            <input type="file" ref={uploadRef} onChange={handleUpload} hidden />
        </div>
    );
};

export default function FileUpload() {
    const [fileData, setFileData] = useState<any>(null);

    return (
        <div>
            <h2>File Upload</h2>
            <UploadButton setFileData={setFileData} />
            {fileData && <pre>{JSON.stringify(fileData, null, 2)}</pre>}
        </div>
    );
}

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const UploadButton = ({ uploadError, setUploadError }: { uploadError: string, setUploadError: (error: string) => void }) => {
    const uploadRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            const file = event.target.files[0];
            console.log(file);

            if (file.type !== 'application/json') {
                setUploadError('Please upload a .json file');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                if (e.target && e.target.result) {
                    const fileContent = e.target.result as string;
                    const jsonFile = JSON.parse(fileContent);

                    // router.push({
                    //     pathname: '/resume',
                    //     query: { file: JSON.stringify(jsonFile) },
                    // });
                }
            };
            reader.readAsText(file);
        }
    };

    return (
        <div>
            <button onClick={() => uploadRef.current?.click()}>Upload File</button>
            <input type="file" ref={uploadRef} onChange={handleUpload} />
            {uploadError && <p>{uploadError}</p>}
        </div>
    );
};

export default function FileUpload() {
    const [uploadError, setUploadError] = useState<string>('');

    return (
        <div>
            <h2>File Upload</h2>
            <UploadButton uploadError={uploadError} setUploadError={setUploadError} />
        </div>
    );
}

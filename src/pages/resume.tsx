import { useRouter } from "next/router";
import { useEffect, useState } from "react";

export default function Resume() {
    const router = useRouter();
    const [fileData, setFileData] = useState(null);

    useEffect(() => {
        if (router.query.file) {
            const data = JSON.parse(router.query.file as string);
            setFileData(data);
        }
    }, [router.query.file]);

    return (
        <div>
            <h1>Resume</h1>
            {fileData && (
                <pre>{JSON.stringify(fileData, null, 2)}</pre>
            )}
        </div>
    );
}
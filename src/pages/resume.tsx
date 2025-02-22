"use client"
import Header from "@/components/Header";
import SectionCard from "@/components/SectionCard";
import PDF from "@/components/PDF";
import FileUpload from "@/components/FileUpload";

export default function Resume() {
    /*
    const router = useRouter();
    const [fileData, setFileData] = useState(null);

    useEffect(() => {
        if (router.query.file) {
            const data = JSON.parse(router.query.file as string);
            setFileData(data);
        }
    }, [router.query.file]);
    */

    return (
        /*
        <div>
            <h1>Resume</h1>
            {fileData && (
                <pre>{JSON.stringify(fileData, null, 2)}</pre>
            )}
        </div>
        */

        <div>
            <Header/>
            <div className={`grid grid-cols-2`}>
                <div><SectionCard/>
                <FileUpload/></div>
                <div>
                    <PDF/>
                </div>
            </div>
        </div>
    );
}

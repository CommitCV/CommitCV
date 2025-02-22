"use client"
import { useDropzone } from "react-dropzone";

export default function GetStarted() {

    const {acceptedFiles, getRootProps, getInputProps} = useDropzone();

    const files = acceptedFiles.map(file => (
        <li key={file.path}>
            {file.path} - {file.size} bytes
        </li>
    ));
    return(
        <div className={`grid grid-rows-1 grid-cols-2`}>
            <div className={`bg-gray-200 rounded-2xl w-[30vw] h-[30vw] m-auto`}>
                <h1 className={`text-4xl`}>Start a new resume!</h1>
                <button>Click Here</button>

            </div>
            <div className={`bg-gray-200 rounded-2xl w-[30vw] h-[30vw] m-auto`}>
                <h1 className={`text-4xl`}>I already have a file</h1>
                <section className="w-container bg-gray-400">
                    <div {...getRootProps({className: 'dropzone w-full h-full'})}>
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
    )
}
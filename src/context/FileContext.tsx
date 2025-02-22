"use client";

import React from "react";
import { createContext, useContext, useState, ReactNode } from "react";

interface FileContextType {
    fileData: any;
    setFileData: (data: any) => void;
}

const FileContext = createContext<FileContextType | undefined>(undefined);

export function FileProvider({ children }: { children: ReactNode }) {
    const [fileData, setFileData] = useState<any>(null);

    return (
        <FileContext.Provider value={{ fileData, setFileData }}>
            {children}
        </FileContext.Provider>
    );
}

export function useFile() {
    const context = useContext(FileContext);
    if (!context) {
        throw new Error("useFile must be used within a FileProvider");
    }
    return context;
}


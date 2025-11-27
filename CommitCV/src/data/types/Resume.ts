export interface Resume {
    filename: string;
    dateCreated: string;
    version: number
    resume: Section[]
}

export interface Section {
    title: string;
    type: string;
    content?: ResumeText[];
    section?: Section[];
}

export interface ResumeText {
    content: string;
    flags: string[];
}
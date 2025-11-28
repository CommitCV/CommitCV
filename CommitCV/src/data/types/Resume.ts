export interface Resume {
    filename: string;
    saveDate: string;
    dateCreated: string;
    version: number
    sections: Section[]
}

export interface Section {
    title: string;
    type: SectionType;
    toggled: boolean;
    content?: ResumeText[];
    subsection?: Section[];
}

export interface ResumeText {
    content: string;
    flags: Flag[];
    toggled: boolean;
}

type Flag = 'bold' | 'italic' | 'underline' | 'strikethrough' | 'link' | 'icon' | 'bullet' | 'bigger';
type SectionType = 'header' | 'full-text' | 'sub-full-text' | 'two-split' | 'sub-two-split' | 'two-three-split' | 'sub-two-three-split';
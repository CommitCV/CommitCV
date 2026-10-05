export const SCHEMA_VERSION = 1;

export type TFlag =
    | "bold"
    | "italics"
    | "underline"
    | "strikethrough"
    | "link"
    | "icon"
    | "bullet"
    | "bigger";

export type TSectionType =
    | "header"
    | "full-text"
    | "two-split"
    | "four-text-split"
    | "sub-full-text"
    | "sub-two-split"
    | "sub-four-text-split";

export interface IResumeText {
    text: string;
    flags: TFlag[];
    toggled: boolean;
}

export interface ISection {
    title: string;
    type: TSectionType;
    toggled: boolean;
    content: IResumeText[];
    subsections: ISection[];
}

export interface IResume {
    filename: string;
    date: string;
    schema_version: number;
    sections: ISection[];
}

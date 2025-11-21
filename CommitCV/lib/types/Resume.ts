export interface Bullet {
    bold?: string,
    normal?: string
}

export interface Paragraph {
    bold?: string,
    normal?: string
}

export interface Subsection {
    title: string,
    link?: string,
    date?: string,
    subtitle?: string,
    location?: string,
    bulletCollection?: Bullet[],
    paragraphCollection?: Paragraph[]
}

export interface Section {
    name: string,
    subsections?: Subsection[]
    bulletCollection?: Bullet[],
    paragraphCollection?: Paragraph[]
}

export interface HeaderObject {
    text: string,
    link?: string
}

export interface Header {
    name: string,
    subheaders?: HeaderObject[]
}

export interface Resume {
    header: Header,
    sections: Section[]
}
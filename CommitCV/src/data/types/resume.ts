export type Bullet = {
    bold?: string,
    normal?: string
}

export type Paragraph = {
    bold?: string,
    normal?: string
}

export type Subsection = {
    title: string,
    link?: string,
    date: string,
    subtitle: string,
    location?: string,
    bulletCollection?: Bullet[],
    paragraphCollection?: Paragraph[]
}

export type Section = {
    name: string,
    subsections?: Subsection[]
    bulletCollection?: Bullet[],
    paragraphCollection?: Paragraph[]
}

export type HeaderObject = {
    text: string,
    link?: string
}

export type Header = {
    name: string,
    subheaders?: HeaderObject[]
}

export type Resume = {
    header: Header,
    sections: Section[]
}


export function Preamble() {
    const preamble = `%-------------------------
% Resume in Latex
% Author : Jake Gutierrez
% Based off of: https://github.com/sb2nov/resume
% License : MIT
% Generated using CommitCV
% https://github.com/CommitCV/CommitCV
%------------------------

\\documentclass[letterpaper,11pt]{article}

\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\usepackage{graphicx}
\\input{glyphtounicode}


%----------FONT OPTIONS----------
% sans-serif
% \\usepackage[sfdefault]{FiraSans}
% \\usepackage[sfdefault]{roboto}
% \\usepackage[sfdefault]{noto-sans}
% \\usepackage[default]{sourcesanspro}

% serif
% \\usepackage{CormorantGaramond}
% \\usepackage{charter}

% \\usepackage{fontawesome5}

\\pagestyle{fancy}
\\fancyhf{} % clear all header and footer fields
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

% Adjust margins
\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}

\\urlstyle{same}

\\raggedbottom
\\raggedright
%\\setlength{\\tabcolsep}{0in}

% Sections formatting
\\titleformat{\\section}{
  \\vspace{-4pt}\\scshape\\raggedright\\large
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]

% Ensure that generate pdf is machine readable/ATS parsable
\\pdfgentounicode=1

%-------------------------
% Custom commands
\\newcommand{\\resumeItem}[1]{
  \\item\\small{
    {#1 \\vspace{-2pt}}
  }
}

\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeSubSubheading}[2]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\textit{\\small#1} & \\textit{\\small #2} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeProjectHeading}[2]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\small#1 & #2 \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeSubItem}[1]{\\resumeItem{#1}\\vspace{-4pt}}

\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}

\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}

%-------------------------------------------
%%%%%%  RESUME STARTS HERE  %%%%%%%%%%%%%%%%%%%%%%%%%%%%


\\begin{document}`

    return preamble;
}

// let x: SkillObject = {title: "a", arr: ["b", "c"]}


export type Bullet = {
    bold?: string,
    normal?: string
}

function BulletToLatex(bullet: Bullet) {
    const bold = bullet.bold ? bullet.bold : "";
    const normal = bullet.normal ? bullet.normal : "";

    return `\t\t\t\t\t\\resumeItem{\\textbf{${bold}} ${normal}}\n`;
}

export type Paragraph = {
    bold?: string,
    normal?: string
}

function ParagraphToLatex(paragraph: Paragraph) {
    const bold = paragraph.bold ? paragraph.bold : "";
    const normal = paragraph.normal ? paragraph.normal : "";


    return `\t\t\t\t\t\\item \\small \\textbf{${bold}}{ ${normal}}\n`
}

export type BulletCollection = {
    bullets: Bullet[]
}

function BulletCollectionToLatex(bulls: BulletCollection) {
    let text = `\t\t\t\\begin{itemize}[leftmargin=0.20in, itemsep=0pt, topsep=5pt, partopsep=0pt]\n`;

    for(const bullet of bulls.bullets) {
        text += BulletToLatex(bullet);
    }

    text += `\t\t\t\\end{itemize}\n\n`;

    return text;
}

/*
function BulletCollectionToLatex(bulls: BulletCollection) {
    let text = `\t\t\t\\resumeItemListStart
                \\small\n`; // Adjust font size to small

    for(const bullet of bulls.bullets) {
        text += BulletToLatex(bullet);
    }

    text += `\t\t\t\\resumeItemListEnd\n\n`;

    return text;
}
*/

export type ParagraphCollection = {
    paragraphs: Paragraph[]
}

function ParagraphCollectionToLatex(paragraphs: ParagraphCollection) {
    let text = `\t\t\t\\begin{itemize}[leftmargin=0.15in, label={}]\n`;

    for(const para of paragraphs.paragraphs) {
        text += ParagraphToLatex(para);
    }

    text += `t\t\t\\end{itemize}\n\n`;

    return text;
}

export type Subsection = {
    title: string,
    link?: string,
    date: string,
    subtitle: string,
    location: string,
    condensed?: boolean,
    bulletCollection?: BulletCollection,
    paragraphCollection?: ParagraphCollection
}

function SubsectionToLatex(section : Subsection) {
    let subheading;

    if (!section.condensed) {
        subheading = `\t\t\\resumeSubheading{${section.title}}{${section.date}}{${section.subtitle}}{${section.location}}\n`
    } else {
        subheading = `\t\t\\resumeSubheading{\\textbf{`
        if (section.link) {
            subheading += `\\href{${section.link}}{\\underline{${section.title}}}`
        } else {
            subheading += section.title
        }
        subheading += `} $|$ \\emph{${section.subtitle}}}{${section.date}}\n`
    }
    if(section.bulletCollection) {
        subheading += BulletCollectionToLatex(section.bulletCollection);
    }
    if(section.paragraphCollection) {
        subheading += ParagraphCollectionToLatex(section.paragraphCollection);
    }

    return subheading;
}

export type Section = {
    name: string,
    subsections?: Subsection[]
    bulletCollection?: BulletCollection,
    paragraphCollection?: ParagraphCollection
}

export function SectionToLatex(section: Section) {
    let text = `\\section{${section.name}}\n`;

    if(section.subsections) {
        text += `\t\\resumeSubHeadingListStart\n`

        for(const sec of section.subsections) {
            text += SubsectionToLatex(sec);
        }

        text += `\t\\resumeSubHeadingListEnd\n\n\n`
    }
    if(section.bulletCollection) {
        text += BulletCollectionToLatex(section.bulletCollection);
    }
    if(section.paragraphCollection) {
        text += ParagraphCollectionToLatex(section.paragraphCollection);
    }

    return text;
}

export type Header = {
    text: string,
    link?: string
}

// Function that returns Latex of the Header
export function HeaderToLatex(name: string, data : Header[]) {
    let header = `\\begin{center}
    \\textbf{\\Huge \\scshape ${name}} \\\\ \\vspace{1pt}`

    for (let i = 0; i < data.length; i++) {
        if (data[i].link) {
            header += `\\href{${data[i].link}}{\\underline{${data[i].text}}}`
        } else {
            header += `\\small ${data[i].text}`
        }
        if (i+1 != data.length) {
            header += ` $|$ `
        }
    }
    header += `\n\\end{center}\n\n`
    return header;
}

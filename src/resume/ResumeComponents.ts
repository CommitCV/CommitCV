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

\\usepackage{fontawesome5}

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

export type HeaderObject = {
    isLink: boolean,
    text: string,
    link: string | null
}

export function HeaderComponent(name: string, data: HeaderObject[]) {
    let header = `\\begin{center}
    \\textbf{\\Huge \\scshape ${name}} \\\\ \\vspace{1pt}`

    for (let i = 0; i < data.length; i++) {
        if (data[i].isLink) {
        header += `\\href{${data[i].link}}{\\underline{${data[i].text}}}`
    }
        if (!data[i].isLink) {
            header += `\\small ${data[i].text}`
        }
        if (i+1 != data.length) {
            header += ` $|$ `
        }
    }
    header += `\\end{center}`
    return header;
}

export function GenerateSection(name: string) {
    return `\\section{` + name + `}`;
}

export type TextObject = {
    isBold: boolean,
    text: string
}

export function GenerateTextSection(data: TextObject[]) {
    let text = `\\begin{quote}\n`
    for (let i = 0; i < data.length; i++) {
        if (data[i].isBold) {
            text += `\\textbf{${data[i].text}}`
        }
        if (!data[i].isBold) {
            text += data[i].text
        }
    }
    text += `\\end{quote}`
    return text;
}

export type ResumeSubheadingObject = {
    title: string,
    link?: string,
    date: string,
    subtitle: string,
    location: string
    condensed?: boolean
}

export function GenerateResumeSubheading(data: ResumeSubheadingObject) {
    let subheading
    if (!data.condensed) {
        subheading = `\\resumeSubheading{${data.title}}{${data.date}}{${data.subtitle}}{${data.location}}`
    } else {
        subheading = `\\resumeProjectHeading{\\textbf{`
        if (data.link) {
            subheading += `\\href{${data.link}}{\\underline{${data.title}}}`
        } else {
            subheading += data.title
        }
        subheading += `} $|$ \\emph{${data.subtitle}}}{${data.date}}
           \\resumeItemListStart`
    }
    return subheading;
}

export type SkillObject = {
    title: string,
    skills: string[]
}

export function GenerateSkills(data: SkillObject[]) {
    let skills = `\\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{`

    for (let i = 0; i < data.length; i++) {
        skills += `\\textbf{` + data[i].title + `}{: `

        for (let j = 0; j < data[i].skills.length; j++) {
            skills += data[i].skills[j]
            if (j+1 != data[i].skills.length) {
                skills += `, `
            }
        }
        if (i+1 != data.length) {
            skills += `} \\\\`
        }
    }
    skills += `\end{itemize}`
    return skills;
}

export type BulletObject = {
    text: string
}

export function GenerateBulletPoints(data: BulletObject[]) {
    let bullets = `\\resumeItemListStart`

    for (let i = 0; i < data.length; i++) {
        bullets += `\\resumeItem{${data[i].text}}`
    }
    bullets += `\\resumeItemListEnd`
    return bullets;
}

export function EndDocument() {
    return `\\end{document}`
}
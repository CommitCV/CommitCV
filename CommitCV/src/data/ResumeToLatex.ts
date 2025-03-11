import { Resume, Header, Section, Subsection, Paragraph, Bullet } from "@/data/types/Resume";

function Preamble() {
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
      \\textbf{\\small#1} & \\textit{\\small #2} \\\\
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


function BulletToLatex(bullet: Bullet) {
    const bold = bullet.bold ? bullet.bold : "";
    const normal = bullet.normal ? bullet.normal : "";

    return `\t\t\t\t\t\\resumeItem{\\textbf{${bold}} ${normal}}\n`;
}

function ParagraphToLatex(paragraph: Paragraph) {
    const bold = paragraph.bold ? paragraph.bold : "";
    const normal = paragraph.normal ? paragraph.normal : "";

    return `\t\t\t\t\t\\item \\small \\textbf{${bold}}{ ${normal}}\n`
}
function SubsectionToLatex(section : Subsection) {
    let subheading;

    if (section.location && section.subtitle) {
        subheading = `\t\t\\resumeSubheading{${section.title}}{${section.date}}{${section.subtitle}}{${section.location}}\n`
    } else {
        subheading = `\t\t\\resumeSubSubheading{\\textbf{`
        if (section.link) {
            subheading += `\\href{${section.link}}{\\underline{${section.title}}}`
        } else {
            subheading += section.title
        }
        if (section.subtitle) {
            subheading += `} \\textbar\\ \\textnormal{\\emph{${section.subtitle}}}}{${section.date}}\n`
        } else {
            subheading += `} }{${section.date}}\n`
        }

    }
    if(section.bulletCollection && section.bulletCollection.length > 0) {
        let bulletText = `\t\t\t\\resumeItemListStart\n`;

        for(const bullet of section.bulletCollection) {
            bulletText += BulletToLatex(bullet);
        }

        bulletText += `\t\t\t\\resumeItemListEnd\n\n`;

        subheading += bulletText;
    }
    if(section.paragraphCollection && section.paragraphCollection.length > 0) {
        let paragraphText = `\t\t\t\\begin{itemize}[leftmargin=0.15in, label={}]\n`;

        for(const para of section.paragraphCollection) {
            paragraphText += ParagraphToLatex(para);
        }

        paragraphText+= `\t\t\t\\end{itemize}\n\n`;

        subheading += paragraphText;
    }

    return subheading;
}

function SectionToLatex(section: Section) {
    let text = `\\section{${section.name}}\n`;

    if(section.subsections && section.subsections.length > 0) {
        text += `\t\\resumeSubHeadingListStart\n`

        for(const sec of section.subsections) {
            text += SubsectionToLatex(sec);
        }

        text += `\t\\resumeSubHeadingListEnd\n\n\n`
    }
    if(section.bulletCollection && section.bulletCollection.length > 0) {
        let bulletText = `\t\t\t\\resumeItemListStart\n`;

        for(const bullet of section.bulletCollection) {
            bulletText += BulletToLatex(bullet);
        }

        bulletText += `\t\t\t\\resumeItemListEnd\n\n`;

        text += bulletText;
    }
    if(section.paragraphCollection && section.paragraphCollection.length > 0) {
        let paragraphText = `\t\t\t\\begin{itemize}[leftmargin=0.15in, label={}]\n`;

        for(const para of section.paragraphCollection) {
            paragraphText += ParagraphToLatex(para);
        }

        paragraphText+= `\t\t\t\\end{itemize}\n\n`;

        text += paragraphText;
    }

    return text;
}

function HeaderToLatex(data : Header) {
    let header = `\\begin{center}
    \\textbf{\\Huge \\scshape ${data.name}} \\\\ \\vspace{1pt}`

    if(data.subheaders) {
        for (let i = 0; i < data.subheaders.length; i++) {
            const part = data.subheaders[i];

            if (part.link) {
                header += `\\href{${part.link}}{\\underline{${part.text}}}`;
            } else {
                header += `\\small ${part.text}`;
            }
            if(i < data.subheaders.length - 1) {
                header += ` $|$ `;
            }
        }
    }
    header += `\n\\end{center}\n\n`;
    return header;
}

export function ResumeToLatex(resume: Resume) {
    let tex = Preamble() + `\n\n\n`;

    tex += HeaderToLatex(resume.header);

    for(const section of resume.sections) {
        tex += SectionToLatex(section);
    }

    tex += `\n\n\\end{document}`
    return tex;
}

export function CreateResumeObject(file: any): Resume {
    return file as Resume;
}

import { Resume, Header, Section, Subsection, Paragraph, Bullet } from "@/data/types/resume";

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

    if (section.location) {
        subheading = `\t\t\\resumeSubheading{${section.title}}{${section.date}}{${section.subtitle}}{${section.location}}\n`
    } else {
        subheading = `\t\t\\resumeSubSubheading{\\textbf{`
        if (section.link) {
            subheading += `\\href{${section.link}}{\\underline{${section.title}}}`
        } else {
            subheading += section.title
        }
        subheading += `} \\textbar\\ \\emph{${section.subtitle}}}{${section.date}}\n`
    }
    if(section.bulletCollection) {
        let bulletText = `\t\t\t\\resumeItemListStart\n`;

        for(const bullet of section.bulletCollection) {
            bulletText += BulletToLatex(bullet);
        }

        bulletText += `\t\t\t\\resumeItemListEnd\n\n`;

        subheading += bulletText;
    }
    if(section.paragraphCollection) {
        let paragraphText = `\t\t\t\\begin{itemize}[leftmargin=0.15in, label={}]\n`;

        for(const para of section.paragraphCollection) {
            paragraphText += ParagraphToLatex(para);
        }

        paragraphText+= `t\t\t\\end{itemize}\n\n`;

        subheading += paragraphText;
    }

    return subheading;
}

function SectionToLatex(section: Section) {
    let text = `\\section{${section.name}}\n`;

    if(section.subsections) {
        text += `\t\\resumeSubHeadingListStart\n`

        for(const sec of section.subsections) {
            text += SubsectionToLatex(sec);
        }

        text += `\t\\resumeSubHeadingListEnd\n\n\n`
    }
    if(section.bulletCollection) {
        let bulletText = `\t\t\t\\resumeItemListStart\n`;

        for(const bullet of section.bulletCollection) {
            bulletText += BulletToLatex(bullet);
        }

        bulletText += `\t\t\t\\resumeItemListEnd\n\n`;

        text += bulletText;
    }
    if(section.paragraphCollection) {
        let paragraphText = `\t\t\t\\begin{itemize}[leftmargin=0.15in, label={}]\n`;

        for(const para of section.paragraphCollection) {
            paragraphText += ParagraphToLatex(para);
        }

        paragraphText+= `t\t\t\\end{itemize}\n\n`;

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

const file = {
  "header": {
    "name": "Alex Reynolds",
    "subheaders": [
      {
        "text": "alex.reynolds@example.com"
      },
      {
        "text": "555-12-3456"
      },
      {
        "text": "github.com/alexreynoldsdev",
        "link": "https://github.com/alexreynoldsdev"
      }
    ]
  },
  "sections": [
    {
      "name": "Education",
      "subsections": [
        {
          "title": "University of Cascadia",
          "date": "Sep. 2022 -- Present",
          "subtitle": "Bachelor of Science in Software Engineering, Minor in Cybersecurity",
          "location": "Seattle, WA",
            "bulletCollection": [
              {
                "normal": "GPA: 3.95 / 4.0, Member of the Dean's Honour List"
              },
              {
                "normal": "Relevant Courses: Systems Programming, Web Development, Network Security"
              }
            ]
        }
      ]
    },
    {
      "name": "Work Experience",
      "subsections": [
        {
          "title": "Software Development Intern",
          "date": "May 2023 -- August 2023",
          "subtitle": "NexusTech Solutions",
          "location": "Portland, OR",
            "bulletCollection": [
              {
                "normal": "Developed internal web applications using React and Flask"
              },
              {
                "normal": "Optimized SQL queries to improve database efficiency by 30 percent"
              }
            ]
        }
      ]
    },
    {
      "name": "Volunteer Experience",
      "subsections": [
        {
          "title": "Tutor | CodeCamp for Kids",
          "date": "2023",
            "bulletCollection": [
              {
                "normal": "Mentored students in Python programming fundamentals"
              },
              {
                "normal": "Designed interactive coding exercises to enhance learning engagement"
              }
            ]
        }
      ]
    },
    {
      "name": "Projects",
      "subsections": [
        {
          "title": "EcoTrack: Sustainability Tracker",
          "date": "2024",
          "subtitle": "React, Node.js, PostgreSQL",
          "location": "Seattle, WA",
            "bulletCollection": [
              {
                "normal": "Built a web platform for tracking personal carbon footprints and eco-friendly habits"
              },
              {
                "normal": "Integrated an API for real-time environmental impact calculations"
              }
            ]
        },
        {
          "title": "HomeServer: Self-Hosted Cloud Storage",
          "date": "2024",
          "location": "Seattle, WA",
          "subtitle": "Docker, Linux, Nextcloud",
            "bulletCollection": [
              {
                "normal": "Configured a secure, self-hosted cloud storage solution for personal and family use"
              },
              {
                "normal": "Implemented automated backups and remote access via VPN"
              }
            ]
        },
        {
          "title": "AI Chess Bot",
          "date": "Ongoing",
          "subtitle": "Python, TensorFlow, Flask",
          "location": "Online",
            "bulletCollection": [
              {
                "normal": "Developing an AI-powered chess opponent with machine learning techniques"
              },
              {
                "normal": "Implemented an interactive web interface for gameplay and analysis"
              }
            ]
        }
      ]
    },
    {
      "name": "Awards",
        "bulletCollection": [
          {
            "normal": "President’s Scholarship for Academic Excellence"
          },
          {
            "normal": "Hackathon Winner: Best AI Project at CodeSprint 2024"
          },
          {
            "normal": "Google Cloud Developer Scholarship Recipient"
          },
          {
            "normal": "National Merit Scholar"
          }
        ]
    },
    {
      "name": "Technical Skills",
        "paragraphCollection": [
          {
            "bold": "Languages:",
            "normal": "Python, JavaScript, C++, SQL, Rust, Java, Bash, HTML/CSS"
          },
          {
            "bold": "Tools and Technologies:",
            "normal": "Git, Docker, Linux, PostgreSQL, Flask, React, Node.js, Kubernetes"
          }
        ]
    },
    {
      "name": "Activities and Interests",
        "paragraphCollection": [
          {
            "bold": "Tech Blogger:",
            "normal": "Run a blog with 10,000+ monthly readers covering open-source projects and cybersecurity"
          },
          {
            "bold": "Home Lab Enthusiast:",
            "normal": "Experiment with self-hosted services, network security, and virtualization"
          }
        ]
    }
  ]
}

console.log(ResumeToLatex(CreateResumeObject(file)));

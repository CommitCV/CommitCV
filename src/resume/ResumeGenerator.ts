import * as RC from './ResumeComponents';
import { Header } from './ResumeComponents';


export function GenerateLatex(file : any) {
    const data = file //JSON.parse(file);

    // Add preamble
    let tex = "";
    tex += RC.Preamble() + "\n\n\n";

    // Add Header
    const objArray: Header[] = [];

    for(const key of Object.keys(data.Header.HeaderObject)) {
        const obj = data.Header.HeaderObject[key];

        if (obj) {
            objArray.push(obj);
        }
    }

    tex += RC.HeaderToLatex(data.Header.name, objArray);
    tex += "\n\n";

    //const sectionArray: Section[] = [];

    for (const section of data.Sections) {
      tex += RC.SectionToLatex(section);
    }

    tex += "\n\n\\end{document}"

    console.log(tex);
}


const file = {
  "Header": {
    "name": "Connor Langan",
    "HeaderObject": [
      {
        "text": "connorlangan@gmail.com"
      },
      {
        "text": "420-69-9999"
      },
      {
        "text": "github.com/cjlangan",
        "link": "https://github.com/cjlangan"
      }
    ]
  },
  "Sections": [
    {
      "name": "Education",
      "subsections": [
        {
          "title": "University of Manitoba",
          "date": "Sep. 2023 -- Present",
          "subtitle": "Bachelor of Science in Computer Science (Honours), Minor in Mathematics",
          "location": "Winnipeg, MB",
          "bulletCollection": {
            "bullets": [
              { "normal": "GPA: 4.45 / 4.5, Honours and entering Co-op program Winter 2025" },
              { "normal": "Relevant Courses: Data Structures and Algorithms, Object Orientation, Computer Systems" }
            ]
          }
        }
      ]
    },
    {
      "name": "Work Experience",
      "subsections": [
        {
          "title": "Supervisor/Lifeguard/Water Safety Instructor",
          "date": "June 2020 -- August 2024",
          "subtitle": "Louise Recreation Commission",
          "location": "Pilot Mound, MB",
          "bulletCollection": {
            "bullets": [
              { "normal": "Led pool operations, including scheduling, water quality maintenance, and staff training" },
              { "normal": "Instructed water safety and swimming skills to various skill levels, enhancing community safety" }
            ]
          }
        }
      ]
    },
    {
      "name": "Volunteer Experience",
      "subsections": [
        {
          "title": "Dev Club Hackathon | Mentor",
          "date": "2025",
          "bulletCollection": {
            "bullets": [
              { "normal": "Provided administrative support by enrolling 100+ competitors and managing event logistics" },
              { "normal": "Guided participants through technical challenges, fostering innovation and problem-solving skills" }
            ]
          }
        },
        {
          "title": "Instructor/Lecturer | Dev Club Exam Cram",
          "date": "2024",
          "bulletCollection": {
            "bullets": [
              { "normal": "Delivered an engaging lecture on Analysis of Algorithms to 20 2nd-year students" },
              { "normal": "Developed comprehensive study materials, enhancing students' understanding of complex concepts" }
            ]
          }
        }
      ]
    },
    {
      "name": "Projects",
      "subsections": [
        {
          "title": "FriendLocator: Geolocation Social App",
          "date": "2025",
          "subtitle": "SQLite, Python, Flask, JavaScript",
          "location": "Manitoba",
          "bulletCollection": {
            "bullets": [
              { "normal": "Engineered a self-hosted server with real-time location sharing and direction" },
              { "normal": "Secured 2nd Place in the Robobisons Competition for innovative application of geolocation technology" }
            ]
          }
        },
        {
          "title": "HomeServer: Adblock and Data Storage",
          "date": "2025",
          "location": "Manitoba",
          "subtitle": "Site Hosting, Remote, Headless",
          "bulletCollection": {
            "bullets": [
              { "normal": "Configured a headless Home Server running 24/7, accessible remotely when using VPN" },
              { "normal": "Initiated network-wide adblock, family data storage and media share capabilities" },
              { "normal": "Hosting project websites such as friend-locator.duckdns.org" }
            ]
          }
        },
        {
          "title": "VoiceCompanion: Raspberry Pi AI Assistant",
          "date": "2025",
          "location": "Manitoba",
          "subtitle": "Bash, Text-to-Speech, Speech-to-Text",
          "bulletCollection": {
            "bullets": [
              { "normal": "Engineered an AI assistant for natural language processing" },
              { "normal": "Implemented text-to-speech and speech-to-text capabilities for seamless interaction" },
              { "normal": "Optimized performance for Raspberry Pi, achieving real-time responses without external APIs" }
            ]
          }
        },
        {
          "title": "WebChess: AI Chess Game",
          "date": "Ongoing",
          "subtitle": "JavaScript, Object-Oriented Programming",
          "location": "Online",
          "bulletCollection": {
            "bullets": [
              { "normal": "Developed a fully functional chess game with an intuitive user interface" },
              { "normal": "Implemented complex game logic and move validation using object-oriented principles" },
              { "normal": "Designing an AI opponent using minimax algorithm with alpha-beta pruning" }
            ]
          }
        }
      ]
    },
    {
      "name": "Awards",
      "bulletCollection": {
        "bullets": [
          { "normal": "Highschool Average of 98; Valedictorian" },
          { "normal": "Work Ethic and Community Volunteer Scholarship" },
          { "normal": "Governor General Academic Medal" },
          { "normal": "MHSAA Credit Union Scholar-Athlete Certificate" },
          { "normal": "Boundary Co-op Scholarship for Academic Standing" },
          { "normal": "Askew Memorial Scholarship; Highest Academic Standing" }
        ]
        }
    },
    {
      "name": "Technical Skills",
      "paragraphCollection": {
        "paragraphs": [
          { "bold": "Languages:", "normal": "C, C++, SQL, Java, Rust, JavaScript, Python, R, Bash, HTML/CSS" },
          { "bold": "Tools and Technologies:", "normal": "Git, Unix, Vim, Docker, LaTeX, Flask, React, Node.js, SQL" }
        ]
      }
    },
    {
      "name": "Activities and Interests",
      "paragraphCollection": {
        "paragraphs": [
          { "bold": "YouTuber:", "normal": "Manage a channel with 6500+ subscribers and 2.6M+ views, featuring parameter modification hacking" },
          { "bold": "Linux Enthusiast:", "normal": "Daily drive Arch Linux, constantly exploring and customizing advanced system configurations" }
        ]
      }
    }
  ]
}

GenerateLatex(file);

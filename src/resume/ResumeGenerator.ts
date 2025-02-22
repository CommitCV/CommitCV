import * as RC from './ResumeComponents';
import { Header } from './ResumeComponents';
import { Section } from './ResumeComponents';


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
    "name": "Connor",
    "HeaderObject": [
      {
        "isLink": false,
        "text": "connor@gmail.com",
      },
      {
        "isLink": false,
        "text": "431 444 4444",
      },
      {
        "isLink": true,
        "text": "github.com/cjlangan",
        "link": "https://github.com/cjlangan"
      }
    ]
  },
    "Sections": [
        {
            "name": "Projects",
            "subsections": [
                {
                    "title": "Friend Locator", 
                    "date": "2025",
                    "subtitle": "Geolocation WebApp",
                    "location": "Manitoba",
                    "bulletCollection": [
                        "fostered innovation",
                        "js, html, css",
                        "communication"
                    ],
                },
              ],
        },
        {
            "name": "Skills",
              "bulletCollection": [
                  "REACT",
                  "Command Line"
              ],
        },
    ]
}

GenerateLatex(file);

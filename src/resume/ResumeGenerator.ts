import * as RC from './ResumeComponents';
import { HeaderObject } from './ResumeComponents';


export function makeLatex(file : any) {
    const data = file //JSON.parse(file);

    // Add preamble
    let tex = "";
    tex += RC.Preamble() + "\n";

    // Add Header
    const objArray: HeaderObject[] = [];

    for(const key of Object.keys(data.Header.HeaderObject)) {
        const obj = data.Header.HeaderObject[key];

        if (obj) {
            objArray.push(obj);
        }
    }

    tex += RC.HeaderComponent(data.Header.name, objArray);

    // Iterate over all Components
    for(const key of Object.keys(data.Components)) {
        const obj = data.Components[key];

        // Get type of component 
        console.log(key);
    }


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
  "Components": [
      {
        "subheading": {
            "title": "University of Manitoba", 
            "date": "2025",
            "subtitle": "Computer Science Honours",
            "location": "Manitoba",
        },
      },
      {
        "subheading": {
            "title": "Brandon University", 
            "date": "2023",
            "subtitle": "Computer Science",
            "condensed": true
          }
      }
  ]
}

makeLatex(file);

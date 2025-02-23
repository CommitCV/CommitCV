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

    return (tex);
}

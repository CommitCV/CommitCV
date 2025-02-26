import ResumeCard from "./ResumeCard";
import { Resume } from "@/data/types/Resume";
import { Subsection } from "@/data/types/Resume";

export function generateCards(resume: Resume, onUpdate: (sectionIdx: number, subIdx: number, key: keyof Subsection, value: string) => void) {
    return resume.sections.map((section, sectionIdx) => (
        <div key={sectionIdx} className="border p-4 mb-4">
            <h2 className="text-xl font-bold">{section.name}</h2>
            {section.subsections?.map((subsection, subIdx) => (
                <ResumeCard
                    key={subIdx}
                    subsection={subsection}
                    onUpdate={(key, value) => onUpdate(sectionIdx, subIdx, key, value)}
                />
            ))}
        </div>
    ));
}


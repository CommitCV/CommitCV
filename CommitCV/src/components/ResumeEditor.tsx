"use client"
import {useState} from "react";
import {DragDropContext, Droppable, Draggable} from "@hello-pangea/dnd";
import {Resume, Subsection, Paragraph, Bullet} from "@/data/types/Resume";
import HeaderCard from "@/components/resume_cards/HeaderCard";
import SectionCard from "@/components/resume_cards/SectionCard";
import {FaCirclePlus} from "react-icons/fa6";
import {Section} from "@/data/types/Resume";

interface ResumeEditorProps {
    resume: Resume | null;
    setResume: React.Dispatch<React.SetStateAction<Resume | null>>;
}

export default function ResumeEditor({resume, setResume}: ResumeEditorProps) {

    const [expandedSections, setExpandedSections] = useState<number[]>([]);

    const toggleSectionExpand = (sectionIdx: number) => {
        setExpandedSections((prevExpandedSections) =>
            prevExpandedSections.includes(sectionIdx)
                ? prevExpandedSections.filter((idx) => idx !== sectionIdx)
                : [...prevExpandedSections, sectionIdx]
        );
    };

    const handleUpdate = (path: string, value: string | Subsection[] | Paragraph[] | Bullet[] | null) => {
        if (!resume) return;

        const updatedResume = {...resume};
        const keys = path.split(".");
        let obj: any = updatedResume;

        for (let i = 0; i < keys.length - 1; i++) {
            obj = obj[keys[i]];
        }

        if (value === null) {
            const index = parseInt(keys[keys.length - 1]);
            obj.splice(index, 1);
        } else {
            obj[keys[keys.length - 1]] = value;
        }
        setResume(updatedResume);
    };

    const onDragEnd = (result: any) => {
        if (!result.destination || !resume) return;

        const reorderedSections = [...resume.sections];
        const [movedSection] = reorderedSections.splice(result.source.index, 1);
        reorderedSections.splice(result.destination.index, 0, movedSection);

        setResume({...resume, sections: reorderedSections});
    };

    if (!resume) {
        return <p>Loading...</p>;
    }

    const createSection = () => {
        if (!resume) return;

        const newSection: Section = {
            name: "",
            subsections: [],
            bulletCollection: [],
            paragraphCollection: []
        };

        const updatedResume = {...resume, sections: [...resume.sections, newSection]};

        setResume(updatedResume);
    };

    return (
        <div className="p-4 space-y-6">
            <HeaderCard header={resume.header} handleUpdate={handleUpdate}/>

            {/* Drag and Drop Context */}
            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="sections">
                    {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                            {resume.sections.map((section, sectionIdx) => (
                                <Draggable key={sectionIdx} draggableId={sectionIdx.toString()} index={sectionIdx}>
                                    {(provided) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            className="cursor-move"
                                        >
                                            <SectionCard
                                                section={section}
                                                sectionIdx={sectionIdx}
                                                expandedSections={expandedSections}
                                                toggleSectionExpand={toggleSectionExpand}
                                                handleUpdate={handleUpdate}
                                            />
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>
            <div className={`flex justify-center items-center`}>
                <button onClick={createSection}>
                    <FaCirclePlus size={42}/>
                </button>
            </div>
        </div>
    );
}

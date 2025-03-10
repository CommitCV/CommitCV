import {FaChevronUp, FaChevronDown} from 'react-icons/fa';
import {Section, Subsection, Bullet, Paragraph} from '@/data/types/Resume';
import BulletCollection from '@/components/resume_cards/BulletCollection';
import ParagraphCollection from '@/components/resume_cards/ParagraphCollection';
import SubsectionCard from '@/components/resume_cards/SubsectionCard'
import {FaCircleXmark, FaGripVertical, FaCirclePlus} from "react-icons/fa6";
import {useState} from "react";

interface SectionCardProps {
    section: Section;
    sectionIdx: number;
    expandedSections: number[];
    toggleSectionExpand: (sectionIdx: number) => void;
    handleUpdate: (path: string, value: string | Subsection[] | Paragraph[] | Bullet[] | null) => void;
}

export default function SectionCard({
                                        section,
                                        sectionIdx,
                                        expandedSections,
                                        toggleSectionExpand,
                                        handleUpdate
                                    }: SectionCardProps) {

    const [showSubmenu, setShowSubmenu] = useState(false);

    const createSubsection = () => {
        if (!section) return;

        const newSubsection: Subsection = {
            title: "",
            date: "",
            subtitle: "",
            location: "",
            bulletCollection: [],
            paragraphCollection: []
        }

        if (section.subsections) {
            section.subsections.push(newSubsection);
            handleUpdate(`sections.${sectionIdx}.subsections`, section.subsections);
        }
    }

    const createParagraphCollection = () => {
        if (!section) return;

        const newParagraph: Paragraph = {
            bold: "",
            normal: ""
        }

        if (section.paragraphCollection) {
            section.paragraphCollection.push(newParagraph);
            handleUpdate(`sections.${sectionIdx}.paragraphCollection`, section.paragraphCollection);
        } else {
            handleUpdate(`sections.${sectionIdx}.paragraphCollection`, [newParagraph]);
        }
    }

    const createBulletCollection = () => {
        if (!section) return;

        const newBullet: Bullet = {
            bold: "",
            normal: ""
        }

        if (section.bulletCollection) {
            section.bulletCollection.push(newBullet);
            handleUpdate(`sections.${sectionIdx}.bulletCollection`, section.bulletCollection);
        } else {
            handleUpdate(`sections.${sectionIdx}.bulletCollection`, [newBullet]);
        }
    }

    return (
        <div className="py-6 pl-6 rounded-lg shadow-lg bg-gray-100 inline-block w-full">
            <div className={`grid grid-cols-10 gap-0`}>
                <div className={`col-span-9`}>
                    <div className="flex justify-between items-center">

                        <input
                            type="text"
                            value={section.name}
                            onChange={(e) =>
                                handleUpdate(`sections.${sectionIdx}.name`, e.target.value)
                            }
                            className="text-2xl font-bold w-full p-2 rounded-lg border border-gray-300"
                            placeholder="Enter section title"
                        />
                        <button onClick={() => toggleSectionExpand(sectionIdx)} className="p-2">
                            {expandedSections.includes(sectionIdx) ? <FaChevronUp size={28}/> : <FaChevronDown size={28}/>}
                        </button>

                        <div>
                            <button onClick={() => handleUpdate(`sections.${sectionIdx}`, null)}>
                                <FaCircleXmark size={28} className="text-red-500"/>
                            </button>
                        </div>


                    </div>


                    {expandedSections.includes(sectionIdx) && (
                        <>
                            <BulletCollection
                                bullets={section.bulletCollection || []}
                                handleUpdate={handleUpdate}
                                sectionIdx={sectionIdx}/>
                            <ParagraphCollection paragraphs={section.paragraphCollection || []}
                                                 handleUpdate={handleUpdate} sectionIdx={sectionIdx}/>

                            {section.subsections?.map((sub, subIdx) => (
                                <SubsectionCard key={subIdx} subsection={sub} handleUpdate={handleUpdate}
                                                sectionIdx={sectionIdx} subIdx={subIdx}/>
                            ))}
                            <div className={`flex justify-center items-center pt-3`}>
                                <div className={`p-2`}>
                                    <button onClick={() => setShowSubmenu(!showSubmenu)}>
                                        {showSubmenu ? <FaCircleXmark size={28}/> : <FaCirclePlus size={28}/>}
                                    </button>
                                </div>
                                {showSubmenu && (
                                    <div className="submenu bg-gray-400 rounded-lg p-2">
                                        <div className="flex gap-2">
                                            <button onClick={createSubsection}>Add Subsection</button>
                                            <button onClick={createBulletCollection}>Add Bullet</button>
                                            <button onClick={createParagraphCollection}>Add Paragraph</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
                <div className="col-span-1 py-auto cursor-grab flex justify-center items-center">
                    <FaGripVertical size={21} className="text-gray-500 w-auto"/>
                </div>
            </div>
        </div>
    );
}

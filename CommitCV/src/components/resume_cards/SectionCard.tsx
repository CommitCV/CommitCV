import {FaChevronUp, FaChevronDown} from 'react-icons/fa';
import {Section} from '@/data/types/Resume';
import BulletCollection from '@/components/resume_cards/BulletCollection';
import ParagraphCollection from '@/components/resume_cards/ParagraphCollection';
import SubsectionCard from '@/components/resume_cards/SubsectionCard'
import {FaCircleMinus, FaGripVertical, FaCirclePlus} from "react-icons/fa6";

interface SectionCardProps {
    section: Section;
    sectionIdx: number;
    expandedSections: number[];
    toggleSectionExpand: (sectionIdx: number) => void;
    handleUpdate: (path: string, value: string | null) => void;
}

export default function SectionCard({
                                        section,
                                        sectionIdx,
                                        expandedSections,
                                        toggleSectionExpand,
                                        handleUpdate
                                    }: SectionCardProps) {
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
                                <FaCircleMinus size={28} className="text-red-500"/>
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
                            <div className={`flex justify-center items-center`}>
                                <FaCirclePlus size={28}/>
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

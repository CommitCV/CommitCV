import {Bullet, Paragraph, Subsection} from '@/data/types/Resume';
import BulletCollection from '@/components/resume_cards/BulletCollection';
import {useState} from 'react';
import {FaCirclePlus, FaCircleXmark, FaGripVertical} from "react-icons/fa6";
import ParagraphCollection from "@/components/resume_cards/ParagraphCollection";


interface SubsectionProps {
    subsection: Subsection;
    handleUpdate: (path: string, value: string | Paragraph[] | Bullet[]) => void;
    sectionIdx: number;
    subIdx: number;
    dragHandleProps?: any;
}

export default function SubsectionCard({subsection, handleUpdate, sectionIdx, subIdx, dragHandleProps}: SubsectionProps) {
    const [showSubmenu, setShowSubmenu] = useState(false);

    const createParagraphCollection = () => {
        if (!subsection) return;

        const newParagraph: Paragraph = {
            bold: "",
            normal: ""
        }

        if (subsection.paragraphCollection) {
            subsection.paragraphCollection.push(newParagraph);
            handleUpdate(`sections.${sectionIdx}.subsections.${subIdx}.paragraphCollection`, subsection.paragraphCollection);
        } else {
            handleUpdate(`sections.${sectionIdx}.subsections.${subIdx}.paragraphCollection`, [newParagraph]);
        }
    }

    const createBulletCollection = () => {
        if (!subsection) return;

        const newBullet: Bullet = {
            bold: "",
            normal: ""
        }

        if (subsection.bulletCollection) {
            subsection.bulletCollection.push(newBullet);
            handleUpdate(`sections.${sectionIdx}.subsections.${subIdx}.bulletCollection`, subsection.bulletCollection);
        } else {
            handleUpdate(`sections.${sectionIdx}.subsections.${subIdx}.bulletCollection`, [newBullet]);
        }
    }

    return (
            <div className="py-4 px-4 rounded-lg shadow-lg bg-gray-300 inline-block w-full">
                <div className="grid grid-cols-10 gap-0">
                    <div className="col-span-9">
                        <input
                            type="text"
                            value={subsection.title}
                            onChange={(e) =>
                                handleUpdate(
                                    `sections.${sectionIdx}.subsections.${subIdx}.title`,
                                    e.target.value
                                )
                            }
                            className="w-full p-2 rounded-lg border border-gray-300 mb-2"
                            placeholder="Enter subsection title"
                        />
                        <input
                            type="text"
                            value={subsection.date}
                            onChange={(e) =>
                                handleUpdate(
                                    `sections.${sectionIdx}.subsections.${subIdx}.date`,
                                    e.target.value
                                )
                            }
                            className="w-full p-2 rounded-lg border border-gray-300"
                            placeholder="Enter date"
                        />
                        <input
                            type="text"
                            value={subsection.subtitle}
                            onChange={(e) =>
                                handleUpdate(
                                    `sections.${sectionIdx}.subsections.${subIdx}.subtitle`,
                                    e.target.value
                                )
                            }
                            className="w-full p-2 rounded-lg border border-gray-300"
                            placeholder="Enter subtitle"
                        />
                        <input
                            type="text"
                            value={subsection.location}
                            onChange={(e) =>
                                handleUpdate(
                                    `sections.${sectionIdx}.subsections.${subIdx}.location`,
                                    e.target.value
                                )
                            }
                            className="w-full p-2 rounded-lg border border-gray-300"
                            placeholder="Enter location"
                        />
                        <BulletCollection
                            bullets={subsection.bulletCollection || []}
                            handleUpdate={handleUpdate}
                            sectionIdx={sectionIdx}
                            subIdx={subIdx}
                        />
                        <ParagraphCollection
                            paragraphs={subsection.paragraphCollection || []}
                            handleUpdate={handleUpdate}
                            sectionIdx={sectionIdx}
                            subIdx={subIdx}
                        />
                        <div className="flex justify-center items-center pt-3">
                            <div className="p-2">
                                <button onClick={() => setShowSubmenu(!showSubmenu)}>
                                    {showSubmenu ? <FaCircleXmark size={28}/> : <FaCirclePlus size={28}/>}
                                </button>
                            </div>
                            {showSubmenu && (
                                <div className="submenu bg-gray-400 rounded-lg p-2">
                                    <div className="flex gap-2">
                                        <button onClick={createBulletCollection}>Add Bullet</button>
                                        <button onClick={createParagraphCollection}>Add Paragraph</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    {/* Only the vertical grip area receives dragHandleProps */}
                    <div className="col-span-1 py-auto cursor-grab flex justify-center items-center" {...dragHandleProps}>
                        <FaGripVertical size={21} className="text-gray-500" />
                    </div>
                </div>
            </div>
        );
}

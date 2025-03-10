import {Bullet, Paragraph, Subsection} from '@/data/types/Resume';
import BulletCollection from '@/components/resume_cards/BulletCollection';
import {useState} from 'react';
import {FaCirclePlus, FaCircleXmark} from "react-icons/fa6";
import ParagraphCollection from "@/components/resume_cards/ParagraphCollection";

interface SubsectionProps {
    subsection: Subsection;
    handleUpdate: (path: string, value: string | Paragraph[] | Bullet[]) => void;
    sectionIdx: number;
    subIdx: number;
}

export default function SubsectionCard({subsection, handleUpdate, sectionIdx, subIdx}: SubsectionProps) {
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
        console.log(subsection);
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
        <div className="mb-4 bg-gray-300 p-2 rounded-lg">
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
                subIdx={subIdx}/>
            <ParagraphCollection paragraphs={subsection.paragraphCollection || []} handleUpdate={handleUpdate}
                                 sectionIdx={sectionIdx} subIdx={subIdx}/>
            <div className={`flex justify-center items-center pt-3`}>
                <div className={`p-2`}>
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
    );
}

import {Paragraph} from '@/data/types/Resume';

interface ParagraphCollectionProps {
    paragraphs: Paragraph[];
    handleUpdate: (path: string, value: string) => void;
    sectionIdx: number;
    subIdx?: number;
}

export default function ParagraphCollection({paragraphs, handleUpdate, sectionIdx, subIdx}: ParagraphCollectionProps) {
    const path = subIdx !== undefined
        ? `sections.${sectionIdx}.subsections.${subIdx}.paragraphCollection`
        : `sections.${sectionIdx}.paragraphCollection`;

    return (
        <>
            {paragraphs.map((paragraph, paragraphIdx) => (
                <div key={paragraphIdx} className="mb-4 flex items-center">
                    <input
                        type="text"
                        value={paragraph.bold}
                        onChange={(e) =>
                            handleUpdate(
                                `${path}.${paragraphIdx}.bold`,
                                e.target.value
                            )
                        }
                        className="p-2 font-bold border border-gray-300 rounded-lg flex-[1] min-w-0"
                        placeholder="Enter bold text"
                    />
                    <input
                        type="text"
                        value={paragraph.normal}
                        onChange={(e) =>
                            handleUpdate(
                                `${path}.${paragraphIdx}.normal`,
                                e.target.value
                            )
                        }
                        className="p-2 border border-gray-300 rounded-lg ml-2 flex-[3] min-w-0"
                        placeholder="Enter normal text"
                    />
                </div>
            ))}
        </>
    );
}

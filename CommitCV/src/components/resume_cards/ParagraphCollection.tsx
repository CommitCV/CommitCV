import {FaGripVertical} from "react-icons/fa"
import { Paragraph } from '@/data/types/Resume';
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

interface ParagraphCollectionProps {
    paragraphs: Paragraph[];
    handleUpdate: (path: string, value: string | Paragraph[]) => void;
    sectionIdx: number;
    subIdx?: number;
}

export default function ParagraphCollection({ paragraphs, handleUpdate, sectionIdx, subIdx }: ParagraphCollectionProps) {
    const path = subIdx !== undefined
        ? `sections.${sectionIdx}.subsections.${subIdx}.paragraphCollection`
        : `sections.${sectionIdx}.paragraphCollection`;

    const handleUpdateParagraphs = (newParagraphs: Paragraph[]) => {
        handleUpdate(path, newParagraphs);
    };

    const onDragEnd = (result: any) => {
        if (!result.destination) return; // Dropped outside the list
        const reorderedParagraphs = Array.from(paragraphs);
        const [movedParagraph] = reorderedParagraphs.splice(result.source.index, 1);
        reorderedParagraphs.splice(result.destination.index, 0, movedParagraph);

        handleUpdateParagraphs(reorderedParagraphs);
    };

    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="paragraphs" type="paragraph">
                {(provided) => (
                    <div
                        {...provided.droppableProps}
                        ref={provided.innerRef}
                        className="space-y-1"
                    >
                        {paragraphs.map((paragraph, paragraphIdx) => (
                            <Draggable
                                key={paragraphIdx}
                                draggableId={paragraphIdx.toString()}
                                index={paragraphIdx}
                            >
                                {(provided) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className="mb-1 flex items-center cursor-move"
                                    >
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
                                        <div className="ml-2 cursor-grab flex justify-center items-center"
                                            {...provided.dragHandleProps} >
                                            <FaGripVertical size={21} className="text-gray-500"/>
                                        </div>
                                    </div>
                                )}
                            </Draggable>
                        ))}
                        {provided.placeholder}
                    </div>
                )}
            </Droppable>
        </DragDropContext>
    );
}

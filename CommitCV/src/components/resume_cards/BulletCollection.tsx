import {FaGripVertical, FaCircleXmark} from "react-icons/fa6"
import { Bullet } from '@/data/types/Resume';
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

interface BulletCollectionProps {
  bullets: Bullet[];
  handleUpdate: (path: string, value: string | Bullet[] | null) => void;
  sectionIdx: number;
  subIdx?: number;  // Make subIdx optional to allow section-level bullets
}

export default function BulletCollection({ bullets, handleUpdate, sectionIdx, subIdx }: BulletCollectionProps) {
    // Create a path for the section or subsection bullets
    const path = subIdx !== undefined
        ? `sections.${sectionIdx}.subsections.${subIdx}.bulletCollection`
        : `sections.${sectionIdx}.bulletCollection`;

        const handleUpdateBullets = (newBullets: Bullet[]) => {
            handleUpdate(path, newBullets);
        };

    const onDragEnd = (result: any) => {
        if (!result.destination) return; // Dropped outside the list
        const reorderedBullets = Array.from(bullets);
        const [movedBullet] = reorderedBullets.splice(result.source.index, 1);
        reorderedBullets.splice(result.destination.index, 0, movedBullet);

        handleUpdateBullets(reorderedBullets);
    };

    return (
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId={`bullets-${sectionIdx}${subIdx || ""}`} type="bullet">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="space-y-1"
              >
                {bullets.map((bullet, bulletIdx) => (
                  <Draggable
                    key={bulletIdx}
                    draggableId={bulletIdx.toString()}
                    index={bulletIdx}
                  >
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className="mb-1 flex items-center cursor-move"
                      >
                        <span className="mr-2">•</span>
                        <input
                          type="text"
                          value={bullet.bold}
                          onChange={(e) => {
                            handleUpdate(
                              `${path}.${bulletIdx}.bold`,  // Update path based on subsection or section
                              e.target.value
                            );
                          }}
                          className="p-2 font-bold border border-gray-300 rounded-lg flex-[1] min-w-0"
                          placeholder="Enter bold part"
                        />
                        <input
                          type="text"
                          value={bullet.normal}
                          onChange={(e) => {
                            handleUpdate(
                              `${path}.${bulletIdx}.normal`,  // Update path based on subsection or section
                              e.target.value
                            );
                          }}
                          className="p-2 border border-gray-300 rounded-lg ml-2 flex-[3] min-w-0"
                          placeholder="Enter normal part"
                        />
                      <button onClick={() => handleUpdate(`${path}.${bulletIdx}`, null)}>
                        <FaCircleXmark size={28} className="ml-2 text-red-500" />
                      </button>
                        {/* Vertical Grip Icon for Bullets */}
                        <div
                          className="ml-2 cursor-grab flex justify-center items-center"
                          {...provided.dragHandleProps}
                        >
                          <FaGripVertical size={21} className="text-gray-500" />
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

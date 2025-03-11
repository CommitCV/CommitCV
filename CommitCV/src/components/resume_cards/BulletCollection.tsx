import { Bullet } from '@/data/types/Resume';

interface BulletCollectionProps {
  bullets: Bullet[];
  handleUpdate: (path: string, value: string) => void;
  sectionIdx: number;
  subIdx?: number;  // Make subIdx optional to allow section-level bullets
}

export default function BulletCollection({ bullets, handleUpdate, sectionIdx, subIdx }: BulletCollectionProps) {
  // Create a path for the section or subsection bullets
  const path = subIdx !== undefined
    ? `sections.${sectionIdx}.subsections.${subIdx}.bulletCollection`
    : `sections.${sectionIdx}.bulletCollection`;

  return (
    <>
      {bullets.map((bullet, bulletIdx) => (
        <div key={bulletIdx} className="mb-4 flex items-center">
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
        </div>
      ))}
    </>
  );
}

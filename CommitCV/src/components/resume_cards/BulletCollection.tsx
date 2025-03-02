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
        <div key={bulletIdx} className="mb-4 p-4 border-l-4 border-blue-500 bg-blue-100">
          <input
            type="text"
            value={bullet.normal}
            onChange={(e) => {
              handleUpdate(
                `${path}.${bulletIdx}.normal`,  // Update path based on subsection or section
                e.target.value
              );
            }}
            className="w-full p-2 rounded-lg border border-gray-300"
            placeholder="Enter bullet text"
          />
        </div>
      ))}
    </>
  );
}

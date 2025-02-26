import { Bullet } from '@/data/types/Resume';

interface BulletCollectionProps {
  bullets: Bullet[];
  handleUpdate: (path: string, value: string) => void;
  sectionIdx: number;
}

export default function BulletCollection({ bullets, handleUpdate, sectionIdx }: BulletCollectionProps) {
  return (
    <>
      {bullets.map((bullet, bulletIdx) => (
        <div key={bulletIdx} className="mb-4 p-4 border-l-4 border-blue-500 bg-blue-100">
          <input
            type="text"
            value={bullet.normal}
            onChange={(e) =>
              handleUpdate(
                `sections.${sectionIdx}.bulletCollection.${bulletIdx}.normal`,
                e.target.value
              )
            }
            className="w-full p-2 rounded-lg border border-gray-300"
            placeholder="Enter bullet text"
          />
        </div>
      ))}
    </>
  );
}
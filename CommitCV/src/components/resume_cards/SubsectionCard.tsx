import { Subsection } from '@/data/types/Resume';
import BulletCollection from '@/components/resume_cards/BulletCollection';

interface SubsectionProps {
  subsection: Subsection;
  handleUpdate: (path: string, value: string) => void;
  sectionIdx: number;
  subIdx: number;
}

export default function SubsectionCard({ subsection, handleUpdate, sectionIdx, subIdx }: SubsectionProps) {
  return (
    <div className="mb-4">
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
      <BulletCollection bullets={subsection.bulletCollection || []} handleUpdate={handleUpdate} sectionIdx={sectionIdx} />
    </div>
  );
}
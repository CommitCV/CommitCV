import { FaChevronUp, FaChevronDown } from 'react-icons/fa';
import { Section } from '@/data/types/Resume';
import BulletCollection from '@/components/resume_cards/BulletCollection';
import ParagraphCollection from '@/components/resume_cards/ParagraphCollection';
import Subsection from '@/components/resume_cards/SubsectionCard';

interface SectionCardProps {
  section: Section;
  sectionIdx: number;
  expandedSections: number[];
  toggleSectionExpand: (sectionIdx: number) => void;
  handleUpdate: (path: string, value: string) => void;
}

export default function SectionCard({ section, sectionIdx, expandedSections, toggleSectionExpand, handleUpdate }: SectionCardProps) {
  return (
    <div className="p-6 rounded-lg shadow-lg bg-gray-100">
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
          {expandedSections.includes(sectionIdx) ? <FaChevronUp /> : <FaChevronDown />}
        </button>
      </div>

      {expandedSections.includes(sectionIdx) && (
        <>
          <BulletCollection bullets={section.bulletCollection || []} handleUpdate={handleUpdate} sectionIdx={sectionIdx} />
          <ParagraphCollection paragraphs={section.paragraphCollection || []} handleUpdate={handleUpdate} sectionIdx={sectionIdx} />

          {section.subsections?.map((sub, subIdx) => (
            <Subsection key={subIdx} subsection={sub} handleUpdate={handleUpdate} sectionIdx={sectionIdx} subIdx={subIdx} />
          ))}
        </>
      )}
    </div>
  );
}
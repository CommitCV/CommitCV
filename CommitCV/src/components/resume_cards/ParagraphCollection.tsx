import { Paragraph } from '@/data/types/Resume';

interface ParagraphCollectionProps {
  paragraphs: Paragraph[];
  handleUpdate: (path: string, value: string) => void;
  sectionIdx: number;
}

export default function ParagraphCollection({ paragraphs, handleUpdate, sectionIdx }: ParagraphCollectionProps) {
  return (
    <>
      {paragraphs.map((paragraph, paragraphIdx) => (
        <div key={paragraphIdx} className="mb-4">
          <input
            type="text"
            value={paragraph.bold}
            onChange={(e) =>
              handleUpdate(
                `sections.${sectionIdx}.paragraphCollection.${paragraphIdx}.bold`,
                e.target.value
              )
            }
            className="w-full p-2 rounded-lg border border-gray-300"
            placeholder="Enter bold text"
          />
          <input
            type="text"
            value={paragraph.normal}
            onChange={(e) =>
              handleUpdate(
                `sections.${sectionIdx}.paragraphCollection.${paragraphIdx}.normal`,
                e.target.value
              )
            }
            className="w-full p-2 rounded-lg border border-gray-300"
            placeholder="Enter normal text"
          />
        </div>
      ))}
    </>
  );
}
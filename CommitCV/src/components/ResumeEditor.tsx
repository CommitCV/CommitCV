"use client"
import { useEffect, useState } from "react";
import { Resume } from "../types/resume";
import { FaChevronUp, FaChevronDown } from 'react-icons/fa';

interface ResumeEditorProps {
  resume: Resume | null;
  setResume: React.Dispatch<React.SetStateAction<Resume | null>>;
}

export default function ResumeEditor({ resume, setResume }: ResumeEditorProps) {

    const [expandedSections, setExpandedSections] = useState<number[]>([]);
    const [expandedHeader, setExpandedHeader] = useState<boolean>(false);

    // Function to toggle the expansion state of a section
    const toggleSectionExpand = (sectionIdx: number) => {
        setExpandedSections((prevExpandedSections) =>
          prevExpandedSections.includes(sectionIdx)
            ? prevExpandedSections.filter((idx) => idx !== sectionIdx)
            : [...prevExpandedSections, sectionIdx]
        );
    };

    // Function to toggle the expansion state of the header
    const toggleHeaderExpand = () => {
    setExpandedHeader(!expandedHeader);
    };


    // Update the resume state dynamically
    const handleUpdate = (path: string, value: string) => {
        if (!resume) return;

        const updatedResume = { ...resume };
        const keys = path.split(".");
        let obj: any = updatedResume;

        for (let i = 0; i < keys.length - 1; i++) {
            obj = obj[keys[i]];
        }

        obj[keys[keys.length - 1]] = value;

        setResume(updatedResume);
    };

    if (!resume) {
        return <p>Loading...</p>;
    }


return (
  <div className="p-4 space-y-6">
    {/* Header Card */}
    <div className="p-6 rounded-lg shadow-lg bg-gray-100">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Header</h2>
        <button onClick={toggleHeaderExpand} className="p-2">
          {expandedHeader ? <FaChevronUp /> : <FaChevronDown />}
        </button>
      </div>

      {expandedHeader && (
        <div>
          <input
            type="text"
            value={resume.header.name}
            onChange={(e) => handleUpdate('header.name', e.target.value)}
            className="w-full p-2 rounded-lg border border-gray-300 mb-4"
            placeholder="Enter your name"
          />
          {resume.header.subheaders?.map((subheader, idx) => (
            <div key={idx} className="mb-4">
              <input
                type="text"
                value={subheader.text}
                onChange={(e) =>
                  handleUpdate(`header.subheaders.${idx}.text`, e.target.value)
                }
                className="w-full p-2 rounded-lg border border-gray-300 mb-2"
                placeholder="Enter subheader text"
              />
              <input
                type="text"
                value={subheader.link || ''}
                onChange={(e) =>
                  handleUpdate(`header.subheaders.${idx}.link`, e.target.value)
                }
                className="w-full p-2 rounded-lg border border-gray-300"
                placeholder="Enter URL for link"
              />
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Section Cards */}
    {resume.sections.map((section, sectionIdx) => (
      <div key={sectionIdx} className="p-6 rounded-lg shadow-lg bg-gray-100">
        {/* Section Title with Expand/Collapse Button */}
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

        {/* Render Section Details if Expanded */}
        {expandedSections.includes(sectionIdx) && (
          <>
            {/* Bullet Collection in Section */}
            {section.bulletCollection?.map((bullet, bulletIdx) => (
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

            {/* Paragraph Collection in Section */}
            {section.paragraphCollection?.map((paragraph, paragraphIdx) => (
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

            {/* Subsections in Section */}
            {section.subsections?.map((sub, subIdx) => (
              <div key={subIdx} className="mb-4">
                <input
                  type="text"
                  value={sub.title}
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
                  value={sub.date}
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
                  value={sub.subtitle}
                  onChange={(e) =>
                    handleUpdate(
                      `sections.${sectionIdx}.subsections.${subIdx}.subtitle`,
                      e.target.value
                    )
                  }
                  className="w-full p-2 rounded-lg border border-gray-300"
                  placeholder="Enter subtitle"
                />
                {sub.bulletCollection?.map((bullet, bulletIdx) => (
                  <div key={bulletIdx} className="mb-4 p-4 border-l-4 border-blue-500 bg-blue-100">
                    <input
                      type="text"
                      value={bullet.normal}
                      onChange={(e) =>
                        handleUpdate(
                          `sections.${sectionIdx}.subsections.${subIdx}.bulletCollection.${bulletIdx}.normal`,
                          e.target.value
                        )
                      }
                      className="w-full p-2 rounded-lg border border-gray-300"
                      placeholder="Enter bullet text"
                    />
                  </div>
                ))}
              </div>
            ))}
          </>
        )}
      </div>
    ))}
  </div>
);

}

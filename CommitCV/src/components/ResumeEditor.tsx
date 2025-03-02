"use client"
import { useState } from "react";
import { Resume } from "@/data/types/Resume";
import HeaderCard from "@/components/resume_cards/HeaderCard";
import SectionCard from "@/components/resume_cards/SectionCard";

interface ResumeEditorProps {
  resume: Resume | null;
  setResume: React.Dispatch<React.SetStateAction<Resume | null>>;
}

export default function ResumeEditor({ resume, setResume }: ResumeEditorProps) {

  const [expandedSections, setExpandedSections] = useState<number[]>([]);

  const toggleSectionExpand = (sectionIdx: number) => {
      setExpandedSections((prevExpandedSections) =>
        prevExpandedSections.includes(sectionIdx)
          ? prevExpandedSections.filter((idx) => idx !== sectionIdx)
          : [...prevExpandedSections, sectionIdx]
      );
  };

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
      <HeaderCard header={resume.header} handleUpdate={handleUpdate} />

      {resume.sections.map((section, sectionIdx) => (
        <SectionCard
          key={sectionIdx}
          section={section}
          sectionIdx={sectionIdx}
          expandedSections={expandedSections}
          toggleSectionExpand={toggleSectionExpand}
          handleUpdate={handleUpdate}
        />
      ))}
    </div>
  );
}

import { useState } from 'react';
    import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
    import { ResumeData } from '@/app/resume/page';
    import { Subsection, BulletCollection, ParagraphCollection } from '@/resume/ResumeComponents';
    import TextComponent from './TextComponent';
    import SubsectionCard from './SubsectionCard';
    import HeaderComponent, { IHeaderComponent } from './HeaderComponent';

    interface ISectionCardProps {
        name: string;
        headerCards?: IHeaderComponent[];
        subsections?: Subsection[];
        bulletCollection?: BulletCollection;
        paragraphCollection?: ParagraphCollection;
        setJData: React.Dispatch<React.SetStateAction<ResumeData | null>>;
    }

    export default function SectionCard({
        name,
        headerCards,
        subsections,
        bulletCollection,
        paragraphCollection,
        setJData,
    }: ISectionCardProps) {
        const [isExpanded, setIsExpanded] = useState(false);

        const toggleExpand = () => setIsExpanded(!isExpanded);

        const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const newName = e.target.value;
            setJData(prevData => {
                if (!prevData) return prevData;
                const updatedSections = prevData.Sections.map(section =>
                    section.name === name ? { ...section, name: newName } : section
                );
                return { ...prevData, Sections: updatedSections };
            });
        };

        const handleBulletChange = (index: number, bold: string, normal: string) => {
            setJData(prevData => {
                if (!prevData) return prevData;
                const updatedSections = prevData.Sections.map(section => {
                    if (section.name === name) {
                        const bullets = section.bulletCollection?.bullets ?? [];
                        const updatedBullets = [...bullets];
                        updatedBullets[index] = { bold, normal };
                        return {
                            ...section,
                            bulletCollection: {
                                ...section.bulletCollection,
                                bullets: updatedBullets,
                            },
                        };
                    }
                    return section;
                });
                return { ...prevData, Sections: updatedSections };
            });
        };

        const handleParagraphChange = (index: number, bold: string, normal: string) => {
            setJData(prevData => {
                if (!prevData) return prevData;
                const updatedSections = prevData.Sections.map(section => {
                    if (section.name === name) {
                        const paragraphs = section.paragraphCollection?.paragraphs ?? [];
                        const updatedParagraphs = [...paragraphs];
                        updatedParagraphs[index] = { bold, normal };
                        return {
                            ...section,
                            paragraphCollection: {
                                ...section.paragraphCollection,
                                paragraphs: updatedParagraphs,
                            },
                        };
                    }
                    return section;
                });
                return { ...prevData, Sections: updatedSections };
            });
        };

        const handleHeaderTextChange = (index: number, text: string) => {
            setJData(prevData => {
                if (!prevData) return prevData;
                const updatedHeaderCards = prevData.Header.HeaderObject.map((headerCard, i) =>
                    i === index ? { ...headerCard, text } : headerCard
                );
                return { ...prevData, Header: { ...prevData.Header, HeaderObject: updatedHeaderCards } };
            });
        };

        const handleHeaderLinkChange = (index: number, link: string) => {
            setJData(prevData => {
                if (!prevData) return prevData;
                const updatedHeaderCards = prevData.Header.HeaderObject.map((headerCard, i) =>
                    i === index ? { ...headerCard, link } : headerCard
                );
                return { ...prevData, Header: { ...prevData.Header, HeaderObject: updatedHeaderCards } };
            });
        };

        return (
            <div className="bg-gray-100 shadow-lg rounded-lg p-8">
                <div className="flex justify-between items-center">
                    <input
                        type="text"
                        value={name}
                        placeholder="Section Name"
                        onChange={handleNameChange}
                        className="block min-w-0 p-2 w-[25vw] text-base rounded-xl"
                    />
                    <button onClick={toggleExpand}>
                        {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                    </button>
                </div>
                {isExpanded && (
                    <div className="mt-4">
                        <HeaderComponent
                            headerCards={headerCards?.map((headerCard, index) => ({
                                ...headerCard,
                                onTextChange: (text: string) => handleHeaderTextChange(index, text),
                                onLinkChange: (link: string) => handleHeaderLinkChange(index, link),
                            }))}
                        />
                        {bulletCollection?.bullets?.map((bullet, index) => (
                            <TextComponent
                                key={index}
                                bold={bullet.bold ?? ""}
                                normal={bullet.normal ?? ""}
                                onBoldChange={(newBold: string) => handleBulletChange(index, newBold, bullet.normal ?? "")}
                                onNormalChange={(newNormal: string) => handleBulletChange(index, bullet.bold ?? "", newNormal)}
                            />
                        ))}
                        {paragraphCollection?.paragraphs?.map((paragraph, index) => (
                            <TextComponent
                                key={index}
                                bold={paragraph.bold ?? ""}
                                normal={paragraph.normal ?? ""}
                                onBoldChange={(newBold: string) => handleParagraphChange(index, newBold, paragraph.normal ?? "")}
                                onNormalChange={(newNormal: string) => handleParagraphChange(index, paragraph.bold ?? "", newNormal)}
                            />
                        ))}
                        {subsections?.map((subsection, index) => (
                            <SubsectionCard
                                key={index}
                                sectionName={name}
                                title={subsection.title}
                                link={subsection.link}
                                date={subsection.date}
                                subtitle={subsection.subtitle}
                                location={subsection.location}
                                condensed={subsection.condensed}
                                bulletCollection={subsection.bulletCollection}
                                paragraphCollection={subsection.paragraphCollection}
                                setJData={setJData}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    }

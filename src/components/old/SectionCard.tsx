import { useState } from 'react';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import HeaderObject, { IHeaderComponent } from "@/components/old/HeaderComponent";
import { BulletCollection, ParagraphCollection, Subsection } from "@/resume/ResumeComponents";
import SubsectionCard from "@/components/old/SubsectionCard";
import TextComponent from "@/components/old/TextComponent";
import { ResumeData } from "@/app/resume/page";

interface ISectionCard {
    name: string,
    headerCards?: IHeaderComponent[],
    subsections?: Subsection[],
    bulletCollection?: BulletCollection,
    paragraphCollection?: ParagraphCollection,
    setJData: React.Dispatch<React.SetStateAction<ResumeData | null>>;
}

export default function SectionCard({
    name,
    headerCards,
    subsections,
    bulletCollection,
    paragraphCollection,
    setJData,
}: ISectionCard) {
    const [isExpanded, setIsExpanded] = useState(false);

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    const handleHeaderTextChange = (index: number, text: string) => {
        setJData(prevData => {
            if (!prevData) return prevData;
           if (!prevData || !prevData.Sections[0].headerCards) return prevData;
            const updatedHeaderCards = [...prevData.Sections[0].headerCards!];
            updatedHeaderCards[index].text = text;
            const updatedSections = [...prevData.Sections];
            updatedSections[0].headerCards = updatedHeaderCards;
            return { ...prevData, Sections: updatedSections };
        });
    };

    const handleHeaderLinkChange = (index: number, link: string) => {
        setJData(prevData => {
            if (!prevData) return prevData;
            if (!prevData || !prevData.Sections[0].headerCards) return prevData;
            const updatedHeaderCards = [...prevData.Sections[0].headerCards!];
            updatedHeaderCards[index].link = link;
            const updatedSections = [...prevData.Sections];
            updatedSections[0].headerCards = updatedHeaderCards;
            return { ...prevData, Sections: updatedSections };
        });
    };

    return (
        <div className="bg-gray-100 shadow-lg rounded-lg p-8">
            <div className="flex justify-between items-center">
                <input
                    id="name"
                    name="name"
                    type="text"
                    value={name}
                    onChange={(e) => setJData((prevData) =>
                        prevData ? { ...prevData, name: e.target.value } : prevData
                    )}
                    placeholder={"Section Name"}
                    className="block min-w-0 p-2 w-[25vw] text-base rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline focus:outline-0 sm:text-sm/6"
                />
                <button onClick={toggleExpand} className="focus:outline-none">
                    {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                </button>
            </div>
            {isExpanded && (
                <div className="mt-4">
                    {headerCards && headerCards.map((headerCard, index) => (
                        <HeaderObject
                            key={index}
                            text={headerCard.text}
                            link={headerCard.link}
                            onTextChange={(text) => handleHeaderTextChange(index, text)}
                            onLinkChange={(link) => handleHeaderLinkChange(index, link)}
                        />
                    ))}
                    {subsections && subsections.map((subsection, index) => (
                        <SubsectionCard
                            key={index}
                            {...subsection}
                            setJData={setJData}
                        />
                    ))}
                    {bulletCollection && bulletCollection.bullets.map((bullet, index) => (
                        <TextComponent key={index} bold={bullet.bold} normal={bullet.normal} isBullet={true} />
                    ))}
                    {paragraphCollection && paragraphCollection.paragraphs.map((paragraph, index) => (
                        <TextComponent key={index} bold={paragraph.bold} normal={paragraph.normal}/>
                    ))}
                </div>
            )}
        </div>
    );
}

import { useState } from 'react';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { IHeaderComponent } from "@/components/HeaderComponent";
import HeaderObject from "@/components/HeaderComponent";
import { BulletCollection, ParagraphCollection, Subsection } from "@/resume/ResumeComponents";
import SubsectionCard from "@/components/SubsectionCard";
import TextComponent from "@/components/TextComponent";
import { ResumeData } from "@/app/resume/page";

// Updated interface to include setJData
interface ISectionCard {
    name: string,
    headerCards?: IHeaderComponent[],
    subsections?: Subsection[],
    bulletCollection?: BulletCollection,
    paragraphCollection?: ParagraphCollection,
    setJData: React.Dispatch<React.SetStateAction<ResumeData | null>>; // Accepting setter function
}

export default function SectionCard({
    name,
    headerCards,
    subsections,
    bulletCollection,
    paragraphCollection,
    setJData, // Accepting setJData as prop here
}: ISectionCard) {
    const [isExpanded, setIsExpanded] = useState(false);

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
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
                    {headerCards && headerCards.map((headerCard: IHeaderComponent, index: number) => (
                        <HeaderObject key={index} {...headerCard} />
                    ))}
                    {subsections && subsections.map((subsection: Subsection, index: number) => (
                        <SubsectionCard 
                            key={index} 
                            {...subsection} 
                            setJData={setJData} // Pass down setJData here
                        />
                    ))}
                    {bulletCollection && bulletCollection.bullets.map((bullet, index) => (
                        <TextComponent key={index} bold={bullet.bold} normal={bullet.normal} isBullet={true} />
                    ))}
                    {paragraphCollection && paragraphCollection.paragraphs.map((paragraph, index) => (
                        <TextComponent key={index} bold={paragraph.bold} normal={paragraph.normal} />
                    ))}
                </div>
            )}
        </div>
    );
}

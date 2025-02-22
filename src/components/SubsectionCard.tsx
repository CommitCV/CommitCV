import { BulletCollection, ParagraphCollection } from "@/resume/ResumeComponents";
import { ResumeData } from "@/app/resume/page";

interface ISubsectionCard {
    title: string;
    link?: string;
    date: string;
    subtitle: string;
    location?: string;
    condensed?: boolean;
    bulletCollection?: BulletCollection;
    paragraphCollection?: ParagraphCollection;
    setJData: React.Dispatch<React.SetStateAction<ResumeData | null>>; // Accept setter function
}

export default function SubsectionCard({
    title,
    link,
    date,
    subtitle,
    location,
    condensed,
    bulletCollection,
    paragraphCollection,
    setJData,
}: ISubsectionCard) {

    // Handle input changes
    const handleChange = (field: string, value: string) => {
        setJData((prevData : any) => {
            if (!prevData) return prevData;
            const updatedSections = [...prevData.Sections];
            // Find the section and update it
            const section = updatedSections.find((s) => s.name === "Contact Information");
            if (section) {
                const headerCard = section.headerCards?.find((card : any) => card.text === title);
                if (headerCard) {
                    headerCard[field] = value; // Update the specific field
                }
            }
            return { ...prevData, Sections: updatedSections };
        });
    };

    return (
        <div>
            <div className="flex flex-row p-1 gap-2">
                <input
                    type="text"
                    value={title}
                    placeholder="Title"
                    onChange={(e) => handleChange("text", e.target.value)} // Bind to text
                    className="block min-w-0 py-1.5 pl-1 pr-3 text-base"
                />
                <input
                    type="text"
                    value={link}
                    placeholder="Link"
                    onChange={(e) => handleChange("link", e.target.value)} // Bind to link
                    className="block min-w-0 py-1.5 pl-1 pr-3 text-base"
                />
            </div>
            {/* Continue with other input fields... */}
        </div>
    );
}

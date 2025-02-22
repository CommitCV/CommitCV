import {BulletCollection, ParagraphCollection} from "@/resume/ResumeComponents";
import TextComponent from "@/components/TextComponent";

export interface ISubsectionCard {
    title: string
    link?: string
    date: string
    subtitle: string
    location?: string
    condensed?: boolean
    bulletCollection?: BulletCollection
    paragraphCollection?: ParagraphCollection
}

export default function SubsectionCard({ title, link, date, subtitle, location, condensed, bulletCollection, paragraphCollection}: ISubsectionCard) {
    return (
        <div>
            <div className={`flex flex-row p-1 gap-2`}>
                <input
                    id="name"
                    name="name"
                    type="text"
                    value={title}
                    placeholder={"Title"}
                    className="block min-w-0 py-1.5 pl-1 pr-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline focus:outline-0 sm:text-sm/6"
                />

                <input
                    id="name"
                    name="name"
                    type="text"
                    value={link}
                    placeholder={"Link"}
                    className="block min-w-0 py-1.5 pl-1 pr-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline focus:outline-0 sm:text-sm/6"
                />
            </div>
            <div className={`flex flex-row p-1 gap-2`}>
                <input
                    id="name"
                    name="name"
                    type="text"
                    value={date}
                    placeholder={"Dates"}
                    className="block min-w-0 py-1.5 pl-1 pr-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline focus:outline-0 sm:text-sm/6"
                />

                <input
                    id="name"
                    name="name"
                    type="text"
                    value={subtitle}
                    placeholder={"Subtitle"}
                    className="block min-w-0 py-1.5 pl-1 pr-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline focus:outline-0 sm:text-sm/6"
                />
            </div>
            <div className={`flex flex-row p-1 gap-2`}>
                <input
                    id="name"
                    name="name"
                    type="text"
                    value={location}
                    placeholder={"Location"}
                    className="block min-w-0 py-1.5 pl-1 pr-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline focus:outline-0 sm:text-sm/6"
                />

                <input
                    id="name"
                    name="name"
                    type="checkbox"
                    className="block min-w-0 py-1.5 pl-1 pr-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline focus:outline-0 sm:text-sm/6"
                />
            </div>
            <div>
                {bulletCollection && bulletCollection.bullets.map((bullet, index) => (
                    <TextComponent key={index} bold={bullet.bold} normal={bullet.normal} isBullet={true} />
                ))}
                {paragraphCollection && paragraphCollection.paragraphs.map((paragraph, index) => (
                    <TextComponent key={index} bold={paragraph.bold} normal={paragraph.normal} />
                ))}
            </div>
        </div>
    )
}
import { Subsection } from "@/data/types/resume";

type ResumeCardProps = {
    subsection: Subsection;
    onUpdate: (key: keyof Subsection, value: string) => void;
};

export default function ResumeCard({ subsection, onUpdate }: ResumeCardProps) {
    return (
        <div className="border p-4 mb-4">
            <label className="block">Title:</label>
            <input
                type="text"
                value={subsection.title}
                onChange={(e) => onUpdate("title", e.target.value)}
                className="border p-1 w-full"
            />
            <label className="block mt-2">Date:</label>
            <input
                type="text"
                value={subsection.date}
                onChange={(e) => onUpdate("date", e.target.value)}
                className="border p-1 w-full"
            />
        </div>
    );
}


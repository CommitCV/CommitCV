export interface ThemedCardProps {
    title?: string;
}

export default function ThemedCard({ title }: ThemedCardProps) {
    return (
        <div
            className="
        rounded-2xl p-6
        bg-bg-1
        border border-mid-2
        text-fg-1
      ">
            {title && (
                <h2 className="mb-2 text-sm font-medium text-fg-1">{title}</h2>
            )}
        </div>
    );
}

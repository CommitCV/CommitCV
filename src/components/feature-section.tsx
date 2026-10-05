interface FeatureSectionProps {
    title: string;
    children: React.ReactNode;
    className?: string;
}

export default function FeatureSection({
    title,
    children,
    className = "",
}: FeatureSectionProps) {
    return (
        <section
            className={`flex flex-col items-center gap-6 px-8 py-24 max-w-3xl mx-auto text-center ${className}`}>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-light-950 dark:text-dark-950">
                {title}
            </h2>
            <div className="text-light-700 dark:text-dark-700 text-base md:text-lg leading-relaxed">
                {children}
            </div>
        </section>
    );
}

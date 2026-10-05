interface TextFieldProps {
    value?: string;
    label?: string;
    className?: string;
}

export default function TextField({
    value = "",
    label,
    className = "",
}: TextFieldProps) {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            {label && (
                <span className="text-sm font-medium text-light-950 dark:text-dark-950 shrink-0">
                    {label}
                </span>
            )}
            <div className="flex-1 bg-light-200 dark:bg-dark-100 border border-border-light dark:border-border-dark rounded px-2 py-1 text-sm text-light-950 dark:text-dark-950">
                {value}
            </div>
        </div>
    );
}

import type { ReactNode } from "react";
import ToggleSwitch from "@components/ui/toggle-switch";

interface SectionCardProps {
    title: string;
    headerValue?: string;
    enabled?: boolean;
    expanded?: boolean;
    children?: ReactNode;
    className?: string;
}

export default function SectionCard({
    title,
    headerValue,
    enabled = true,
    expanded = false,
    children,
    className = "",
}: SectionCardProps) {
    return (
        <div
            className={`
                bg-light-200 dark:bg-dark-100
                border-2 border-border-light dark:border-border-dark
                rounded-lg overflow-clip
                ${className}
            `}>
            <div className="flex items-center gap-2 px-3 py-1.5">
                <ToggleSwitch enabled={enabled} />
                <span className="text-base font-semibold text-light-950 dark:text-dark-950">
                    {title}
                </span>
                <div className="flex-1" />
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="10"
                    viewBox="0 0 16 10"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={`text-light-700 dark:text-dark-700 transition-transform ${expanded ? "rotate-180" : ""}`}>
                    <path d="M1 1l7 7 7-7" />
                </svg>
            </div>

            {headerValue !== undefined && (
                <div className="flex items-center gap-2 px-3 pb-2">
                    <span className="text-sm font-medium text-light-950 dark:text-dark-950">
                        Header:
                    </span>
                    <div className="flex-1 bg-light-100 dark:bg-dark-200 border border-border-light dark:border-border-dark rounded px-2 py-1 text-sm text-light-950 dark:text-dark-950">
                        {headerValue}
                    </div>
                </div>
            )}

            {expanded && children && (
                <div className="px-3 pb-3">{children}</div>
            )}
        </div>
    );
}

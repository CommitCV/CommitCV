import type { HTMLAttributes, ReactNode } from "react";

type CardVariant = "surface" | "elevated" | "outlined";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: CardVariant;
    children: ReactNode;
}

const variantClasses: Record<CardVariant, string> = {
    surface:
        "bg-light-300 dark:bg-dark-200 border-4 border-border-light dark:border-border-dark",
    elevated:
        "bg-light-200 dark:bg-dark-100 border-4 border-border-light dark:border-border-dark",
    outlined:
        "bg-transparent border-4 border-dashed border-border-light dark:border-border-dark",
};

export default function Card({
    variant = "surface",
    className = "",
    children,
    ...props
}: CardProps) {
    return (
        <div
            className={`
                rounded-md overflow-clip
                ${variantClasses[variant]}
                ${className}
            `}
            {...props}>
            {children}
        </div>
    );
}

import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    children: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
    primary:
        "bg-accent text-light-50 dark:text-dark-50 font-semibold hover:opacity-90",
    secondary:
        "bg-light-200 dark:bg-dark-100 border-2 border-border-light dark:border-border-dark text-light-950 dark:text-dark-950 font-semibold hover:opacity-90",
    ghost: "bg-transparent text-light-950 dark:text-dark-950 hover:bg-light-200 dark:hover:bg-dark-100",
};

const sizeClasses: Record<ButtonSize, string> = {
    sm: "px-3 py-1.5 text-sm rounded",
    md: "px-5 py-2 text-base rounded-md",
    lg: "px-6 py-2.5 text-lg rounded-md",
};

export default function Button({
    variant = "primary",
    size = "md",
    className = "",
    children,
    ...props
}: ButtonProps) {
    return (
        <button
            className={`
                inline-flex items-center justify-center
                tracking-tight transition-opacity
                ${variantClasses[variant]}
                ${sizeClasses[size]}
                ${className}
            `}
            {...props}>
            {children}
        </button>
    );
}

/** Button look shared by `Button` and links or other elements styled as one. */

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const variantClasses: Record<ButtonVariant, string> = {
    primary:
        "border-transparent bg-accent text-light-50 dark:text-dark-50 font-semibold hover:opacity-90",
    secondary:
        "bg-light-200 dark:bg-dark-100 border-border-light dark:border-border-dark text-light-950 dark:text-dark-950 font-semibold hover:opacity-90",
    ghost: "border-transparent bg-transparent text-light-950 dark:text-dark-950 hover:bg-light-200 dark:hover:bg-dark-100",
};

// Fixed heights so every variant and every link styled as a button lines
// up. `icon` is a square sm. The editor toolbars use their own 28px tier
// (`ToolbarButton`).
const sizeClasses: Record<ButtonSize, string> = {
    sm: "h-8 px-3 text-sm rounded",
    md: "h-10 px-5 text-base rounded-md",
    lg: "h-12 px-6 text-lg rounded-md",
    icon: "h-8 w-8 text-sm rounded",
};

/** The classes of a `Button`, for links and other elements styled as one. */
export function buttonClass(
    variant: ButtonVariant = "primary",
    size: ButtonSize = "md",
    className = "",
) {
    return `
        inline-flex shrink-0 items-center justify-center whitespace-nowrap
        border-2 tracking-tight transition-opacity
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
    `
        .replace(/\s+/g, " ")
        .trim();
}

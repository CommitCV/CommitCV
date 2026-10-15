import { useAppStore } from "@store/useAppStore";

interface LogoProps {
    size?: "sm" | "md" | "lg";
    className?: string;
}

const sizeClasses = {
    sm: "h-8",
    md: "h-12",
    lg: "h-18",
};

export default function Logo({ size = "md", className = "" }: LogoProps) {
    const theme = useAppStore((s) => s.theme);
    const src =
        theme === "dark"
            ? "/img/branding/wordmark-dark.svg"
            : "/img/branding/wordmark-light.svg";

    return (
        <img
            src={src}
            alt="CommitCV"
            className={`${sizeClasses[size]} w-auto ${className}`}
        />
    );
}

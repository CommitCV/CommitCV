import type { ButtonHTMLAttributes, ReactNode } from "react";
import {
    buttonClass,
    type ButtonSize,
    type ButtonVariant,
} from "./button-class";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    children: ReactNode;
}

export default function Button({
    variant = "primary",
    size = "md",
    className = "",
    children,
    ...props
}: ButtonProps) {
    return (
        <button
            className={buttonClass(variant, size, className)}
            {...props}>
            {children}
        </button>
    );
}

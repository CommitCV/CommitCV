import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps & { children: ReactNode }) {
    return (
        <svg
            aria-hidden="true"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}>
            {children}
        </svg>
    );
}

export function ChevronDown(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="m6 9 6 6 6-6" />
        </Icon>
    );
}

export function ChevronLeft(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="m15 18-6-6 6-6" />
        </Icon>
    );
}

export function ChevronRight(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="m9 18 6-6-6-6" />
        </Icon>
    );
}

export function Download(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="M12 3v12" />
            <path d="m7 10 5 5 5-5" />
            <path d="M5 21h14" />
        </Icon>
    );
}

export function ExternalLink(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="M14 5h5v5" />
            <path d="m19 5-8 8" />
            <path d="M19 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h4" />
        </Icon>
    );
}

export function Github(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3.3-.4 6.8-1.6 6.8-7A5.4 5.4 0 0 0 19.3 4 5 5 0 0 0 19.2.5S18 0 15 2.1a13.4 13.4 0 0 0-6 0C6 0 4.8.5 4.8.5A5 5 0 0 0 4.7 4 5.4 5.4 0 0 0 3.2 7.5c0 5.4 3.5 6.6 6.8 7A4.8 4.8 0 0 0 9 18v4" />
            <path d="M9 18c-4.5 2-5-2-7-2" />
        </Icon>
    );
}

export function Plus(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="M12 5v14M5 12h14" />
        </Icon>
    );
}

export function Save(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
            <path d="M17 21v-8H7v8M7 3v5h8" />
        </Icon>
    );
}

export function Trash(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="M3 6h18M8 6V4h8v2m-9 0 1 15h8l1-15M10 11v6m4-6v6" />
        </Icon>
    );
}

export function Upload(props: IconProps) {
    return (
        <Icon {...props}>
            <path d="M12 16V3m0 0L7 8m5-5 5 5M5 21h14" />
        </Icon>
    );
}

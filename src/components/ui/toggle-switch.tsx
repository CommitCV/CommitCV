interface ToggleSwitchProps {
    enabled?: boolean;
    className?: string;
}

export default function ToggleSwitch({
    enabled = true,
    className = "",
}: ToggleSwitchProps) {
    return (
        <div
            className={`
                w-8 h-4 rounded-full relative cursor-pointer transition-colors
                ${enabled ? "bg-green-500" : "bg-red-400"}
                ${className}
            `}>
            <div
                className={`
                    absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform
                    ${enabled ? "left-4" : "left-0.5"}
                `}
            />
        </div>
    );
}

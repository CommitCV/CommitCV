import type { TFlag } from "@resume/resume";
import { Trash } from "@components/ui/icons";
import Button from "@components/ui/button";

interface ContentRowProps {
    value: string;
    flags: TFlag[];
    onChange: (value: string) => void;
    onToggleFlags: (flags: TFlag[], value: string) => void;
    onRemove: () => void;
}

const LINE_MARKERS: Partial<Record<TFlag, string>> = {
    bold: "**",
    italics: "*",
    underline: "__",
};

export default function ContentRow({
    value,
    flags,
    onChange,
    onToggleFlags,
    onRemove,
}: ContentRowProps) {
    return (
        <div className="flex items-start gap-2">
            <span className="w-16 shrink-0 pt-1 text-sm font-medium text-light-950 dark:text-dark-950">
                Text
            </span>
            <input
                aria-label="Resume text"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="min-w-0 flex-1 rounded border border-border-light bg-light-100 px-2 py-1 text-sm text-light-950 outline-none focus:border-accent dark:border-border-dark dark:bg-dark-200 dark:text-dark-950"
            />
            <div className="flex shrink-0 gap-1">
                {formatFlags.map(({ flag, label }) => (
                    <button
                        key={flag}
                        type="button"
                        aria-label={`Toggle ${flag}`}
                        aria-pressed={flags.includes(flag)}
                        onClick={() => {
                            const turningOn = !flags.includes(flag);
                            onToggleFlags(
                                toggleFlag(flags, flag),
                                turningOn
                                    ? value
                                    : unwrapLineStyle(value, flag),
                            );
                        }}
                        className={`h-7 min-w-7 rounded border px-1 text-xs font-semibold ${
                            flags.includes(flag)
                                ? "border-accent bg-accent text-white"
                                : "border-border-light bg-light-200 text-light-700 dark:border-border-dark dark:bg-dark-100 dark:text-dark-700"
                        }`}>
                        {label}
                    </button>
                ))}
                <Button
                    type="button"
                    aria-label="Remove text"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-1.5 text-red-600"
                    onClick={onRemove}>
                    <Trash className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

function toggleFlag(flags: TFlag[], flag: TFlag): TFlag[] {
    return flags.includes(flag)
        ? flags.filter((value) => value !== flag)
        : [...flags, flag];
}

const formatFlags: Array<{ flag: TFlag; label: string }> = [
    { flag: "bold", label: "B" },
    { flag: "italics", label: "I" },
    { flag: "underline", label: "U" },
    { flag: "bullet", label: "•" },
];

// Turning a style off also drops markers that wrap the whole line, unless
// the line has other markup of that kind inside (partial styling stays).
function unwrapLineStyle(value: string, flag: TFlag): string {
    const marker = LINE_MARKERS[flag];
    if (!marker || value.length <= marker.length * 2) return value;
    const inner = value.slice(marker.length, -marker.length);
    return value.startsWith(marker) &&
        value.endsWith(marker) &&
        !inner.includes(marker)
        ? inner
        : value;
}

import ToggleSwitch from "@components/ui/toggle-switch";

interface TextRowProps {
    label: string;
    value: string;
    linkValue?: string;
}

function IconButton({ children }: { children: React.ReactNode }) {
    return (
        <div className="w-6 h-6 flex items-center justify-center rounded bg-light-300 dark:bg-dark-200 border border-border-light dark:border-border-dark text-xs font-bold text-light-950 dark:text-dark-950 cursor-pointer hover:opacity-80">
            {children}
        </div>
    );
}

function TextRow({ label, value, linkValue }: TextRowProps) {
    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-light-950 dark:text-dark-950 shrink-0 w-10">
                    {label}
                </span>
                <div className="flex-1 bg-light-100 dark:bg-dark-200 border border-border-light dark:border-border-dark rounded px-2 py-1 text-sm text-light-950 dark:text-dark-950">
                    {value}
                </div>
                <div className="flex gap-1">
                    <IconButton>B</IconButton>
                    <IconButton>U</IconButton>
                    <IconButton>
                        <LinkIcon />
                    </IconButton>
                    <IconButton>
                        <TrashIcon />
                    </IconButton>
                </div>
            </div>
            {linkValue && (
                <div className="flex items-center gap-2 ml-12">
                    <IconButton>
                        <LinkIcon />
                    </IconButton>
                    <div className="flex-1 bg-light-100 dark:bg-dark-200 border border-border-light dark:border-border-dark rounded px-2 py-1 text-sm text-light-700 dark:text-dark-700">
                        {linkValue}
                    </div>
                </div>
            )}
        </div>
    );
}

function LinkIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
    );
}

function TrashIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
    );
}

export default function HeaderCard() {
    return (
        <div className="bg-light-200 dark:bg-dark-100 border-2 border-border-light dark:border-border-dark rounded-lg overflow-clip">
            <div className="flex items-center gap-2 px-3 py-1.5">
                <ToggleSwitch enabled={true} />
                <span className="text-base font-semibold text-light-950 dark:text-dark-950">
                    Header
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
                    className="text-light-700 dark:text-dark-700 rotate-180">
                    <path d="M1 1l7 7 7-7" />
                </svg>
            </div>

            <div className="flex flex-col gap-3 px-3 pb-3">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-light-950 dark:text-dark-950 shrink-0 w-10">
                        Name:
                    </span>
                    <div className="flex-1 bg-light-100 dark:bg-dark-200 border border-border-light dark:border-border-dark rounded px-2 py-1 text-sm text-light-950 dark:text-dark-950">
                        Alex Reynolds
                    </div>
                </div>

                <TextRow
                    label="Text:"
                    value="alex.reynolds@example.com"
                    linkValue="mailto://alex.reynolds@example.com"
                />

                <TextRow
                    label="Text:"
                    value="555-123-456"
                />

                <TextRow
                    label="Text:"
                    value="github.com/alexreynoldsdev"
                    linkValue="https://github.com/alexreynoldsdev"
                />

                <button
                    type="button"
                    className="self-center flex items-center gap-1 text-sm font-medium text-light-700 dark:text-dark-700 hover:text-light-950 dark:hover:text-dark-950 transition-colors mt-1">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round">
                        <path d="M12 5v14" />
                        <path d="M5 12h14" />
                    </svg>
                    Add Text Element
                </button>
            </div>
        </div>
    );
}

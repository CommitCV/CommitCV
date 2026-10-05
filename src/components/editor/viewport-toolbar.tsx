import Button from "@components/ui/button";

export default function ViewportToolbar() {
    return (
        <div className="flex items-center gap-3 bg-light-300 dark:bg-dark-200 border-2 border-border-light dark:border-border-dark rounded-lg px-3 py-1.5">
            <div className="flex items-center gap-2">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-light-700 dark:text-dark-700 cursor-pointer">
                    <path d="M15 18l-6-6 6-6" />
                </svg>
                <span className="text-sm text-light-950 dark:text-dark-950">
                    Page
                </span>
                <div className="bg-light-200 dark:bg-dark-100 border border-border-light dark:border-border-dark rounded px-2 py-0.5 text-sm text-light-950 dark:text-dark-950 min-w-6 text-center">
                    1
                </div>
                <span className="text-sm text-light-700 dark:text-dark-700">
                    of
                </span>
                <span className="text-sm text-light-950 dark:text-dark-950">
                    1
                </span>
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-light-700 dark:text-dark-700 cursor-pointer">
                    <path d="M9 18l6-6-6-6" />
                </svg>
            </div>

            <div className="flex-1" />

            <Button
                variant="secondary"
                size="sm"
                className="gap-1.5">
                Export .tex
                <ExportIcon />
            </Button>
            <Button
                variant="secondary"
                size="sm"
                className="gap-1.5">
                Export .json
                <ExportIcon />
            </Button>
            <Button
                variant="primary"
                size="sm"
                className="gap-1.5">
                Download
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line
                        x1="12"
                        y1="15"
                        x2="12"
                        y2="3"
                    />
                </svg>
            </Button>
        </div>
    );
}

function ExportIcon() {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
        </svg>
    );
}

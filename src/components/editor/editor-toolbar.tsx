import Button from "@components/ui/button";

export default function EditorToolbar() {
    return (
        <div className="flex items-center gap-3 bg-light-300 dark:bg-dark-200 border-2 border-border-light dark:border-border-dark rounded-lg px-3 py-1.5">
            <span className="text-sm font-medium text-light-950 dark:text-dark-950 shrink-0">
                Resume Name:
            </span>
            <div className="flex-1 bg-light-200 dark:bg-dark-100 border border-border-light dark:border-border-dark rounded px-2 py-1 text-sm text-light-950 dark:text-dark-950">
                alex-reynolds-good-good-final-copy
            </div>
            <div className="flex-1" />
            <Button
                variant="primary"
                size="sm"
                className="gap-1.5">
                Commit Changes
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

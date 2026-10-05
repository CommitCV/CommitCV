import Button from "@components/ui/button";
import { Save } from "@components/ui/icons";
import { useResumeStore } from "@store/useResumeStore";

export default function EditorToolbar() {
    const filename = useResumeStore((store) => store.resume?.filename ?? "");
    const saveState = useResumeStore((store) => store.saveState);
    const setFilename = useResumeStore((store) => store.setFilename);
    const save = useResumeStore((store) => store.save);

    return (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border-2 border-border-light bg-light-300 px-3 py-1.5 dark:border-border-dark dark:bg-dark-200">
            <label className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium">
                <span className="shrink-0">Resume name</span>
                <input
                    aria-label="Resume filename"
                    value={filename}
                    onChange={(event) => setFilename(event.target.value)}
                    className="min-w-0 flex-1 rounded border border-border-light bg-light-100 px-2 py-1 font-normal outline-none focus:border-accent dark:border-border-dark dark:bg-dark-100"
                />
            </label>
            <div className="flex-1" />
            <Button
                type="button"
                variant="primary"
                size="sm"
                className="gap-1.5"
                disabled={saveState === "saving"}
                onClick={() => void save(`update ${filename || "resume"}`)}>
                <Save className="h-4 w-4" />
                {saveState === "saving" ? "Saving…" : "Commit Changes"}
            </Button>
            <span
                role="status"
                className="text-xs text-light-700 dark:text-dark-700">
                {saveState === "dirty" && "Unsaved changes"}
                {saveState === "clean" && "Saved"}
                {saveState === "error" && "Save failed"}
            </span>
        </div>
    );
}

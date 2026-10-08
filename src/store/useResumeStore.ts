import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
    addSection,
    addText,
    moveSection,
    removeSection,
    removeText,
    sectionAt,
    updateSection,
    updateText,
} from "@resume/edit-resume";
import type { TSectionPath } from "@resume/edit-resume";
import type { IResume, IResumeText, ISection } from "@resume/resume";
import { today } from "@resume/dates";
import starter from "@resume/starter-resume.json";
import { GitHubResumeStorage } from "@storage/github-resume-storage";
import { LocalResumeStorage } from "@storage/local-resume-storage";
import type { IResumeStorage } from "@storage/resume-storage";

export type TResumeSource =
    | { kind: "local"; id: string }
    | { kind: "github"; repo: string; path: string };

export type TSaveState = "clean" | "dirty" | "saving" | "error";

const githubStorages = new Map<string, GitHubResumeStorage>();

// Storage seam: production uses the real adapters; tests swap them out.
export const resumeStorages = {
    local: new LocalResumeStorage() as IResumeStorage,
    github(repo: string): IResumeStorage {
        let storage = githubStorages.get(repo);
        if (!storage) {
            storage = new GitHubResumeStorage(repo);
            githubStorages.set(repo, storage);
        }
        return storage;
    },
};

export function storageFor(source: TResumeSource): IResumeStorage {
    return source.kind === "local"
        ? resumeStorages.local
        : resumeStorages.github(source.repo);
}

interface IResumeStore {
    resume: IResume | null;
    source: TResumeSource | null;
    saveState: TSaveState;
    saveError: string | null;
    /** Open sections by dotted path (`"2.0"`); UI-only, never persisted. */
    expanded: Record<string, boolean>;
    load(resume: IResume, source: TResumeSource | null): void;
    newResume(): void;
    setFilename(filename: string): void;
    updateSection(path: TSectionPath, patch: Partial<ISection>): void;
    addSection(parentPath: TSectionPath, section: ISection): void;
    removeSection(path: TSectionPath): void;
    moveSection(path: TSectionPath, offset: -1 | 1): void;
    updateText(
        path: TSectionPath,
        index: number,
        patch: Partial<IResumeText>,
    ): void;
    addText(path: TSectionPath, text: IResumeText): void;
    removeText(path: TSectionPath, index: number): void;
    setExpanded(path: TSectionPath, open: boolean): void;
    save(message?: string): Promise<void>;
}

export const useResumeStore = create<IResumeStore>()(
    persist(
        (set, get) => ({
            resume: null,
            source: null,
            saveState: "clean",
            saveError: null,
            expanded: {},

            load: (resume, source) =>
                set({
                    resume,
                    source,
                    saveState: "clean",
                    saveError: null,
                    expanded: {},
                }),

            newResume: () =>
                set({
                    resume: {
                        ...structuredClone(starter as unknown as IResume),
                        date: today(),
                    },
                    source: null,
                    saveState: "dirty",
                    saveError: null,
                    expanded: {},
                }),

            setFilename: (filename) =>
                set((s) =>
                    s.resume
                        ? {
                              resume: { ...s.resume, filename },
                              saveState: "dirty",
                          }
                        : {},
                ),

            updateSection: (path, patch) =>
                edit(set, (r) => updateSection(r, path, patch)),
            addSection: (parentPath, section) =>
                edit(set, (r) => addSection(r, parentPath, section)),
            removeSection: (path) =>
                set((s) => {
                    if (!s.resume) return {};
                    const resume = removeSection(s.resume, path);
                    const removed = path[path.length - 1];
                    return {
                        resume,
                        saveState: "dirty",
                        expanded: remapExpanded(
                            s.expanded,
                            path.slice(0, -1),
                            (i) =>
                                i === removed ? null : i > removed ? i - 1 : i,
                        ),
                    };
                }),
            moveSection: (path, offset) =>
                set((s) => {
                    if (!s.resume) return {};
                    const resume = moveSection(s.resume, path, offset);
                    const parent = path.slice(0, -1);
                    const from = path[path.length - 1];
                    const to = from + offset;
                    const siblings =
                        parent.length === 0
                            ? s.resume.sections
                            : sectionAt(s.resume, parent)?.subsections;
                    const moved = to >= 0 && to < (siblings?.length ?? 0);
                    return {
                        resume,
                        saveState: "dirty",
                        expanded: moved
                            ? remapExpanded(s.expanded, parent, (i) =>
                                  i === from ? to : i === to ? from : i,
                              )
                            : s.expanded,
                    };
                }),
            updateText: (path, index, patch) =>
                edit(set, (r) => updateText(r, path, index, patch)),
            addText: (path, text) => edit(set, (r) => addText(r, path, text)),
            removeText: (path, index) =>
                edit(set, (r) => removeText(r, path, index)),
            setExpanded: (path, open) =>
                set((s) => ({
                    expanded: { ...s.expanded, [path.join(".")]: open },
                })),

            save: async (message) => {
                const state = get();
                if (!state.resume || state.saveState === "saving") return;
                let source = state.source;
                if (!source) {
                    source = { kind: "local", id: crypto.randomUUID() };
                }
                set({ source, saveState: "saving", saveError: null });
                try {
                    const id =
                        source.kind === "local" ? source.id : source.path;
                    await storageFor(source).save(id, get().resume!, message);
                    set({ saveState: "clean" });
                } catch (err) {
                    set({
                        saveState: "error",
                        saveError:
                            err instanceof Error ? err.message : String(err),
                    });
                }
            },
        }),
        {
            name: "commitcv:draft",
            partialize: ({ resume, source, saveState }) => ({
                resume,
                source,
                saveState: saveState === "saving" ? "dirty" : saveState,
            }),
        },
    ),
);

function edit(
    set: (fn: (s: IResumeStore) => Partial<IResumeStore>) => void,
    fn: (resume: IResume) => IResume,
): void {
    set((s) => (s.resume ? { resume: fn(s.resume), saveState: "dirty" } : {}));
}

/** Re-keys open-state entries under `parent` when sibling indexes shift. */
function remapExpanded(
    expanded: Record<string, boolean>,
    parent: TSectionPath,
    remap: (index: number) => number | null,
): Record<string, boolean> {
    const next: Record<string, boolean> = {};
    for (const [key, open] of Object.entries(expanded)) {
        const path = key.split(".").map(Number);
        const underParent =
            path.length > parent.length &&
            parent.every((index, depth) => path[depth] === index);
        if (!underParent) {
            next[key] = open;
            continue;
        }
        const mapped = remap(path[parent.length]);
        if (mapped === null) continue;
        path[parent.length] = mapped;
        next[path.join(".")] = open;
    }
    return next;
}

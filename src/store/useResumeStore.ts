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

/** Whether text fields show styled text or the raw markup. */
export type TTextMode = "formatted" | "raw";

/** The text field the format toolbar acts on, with its selection. */
export interface IFocusedText {
    path: TSectionPath;
    index: number;
    start: number;
    end: number;
}

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

interface ISnapshot {
    resume: IResume;
    expanded: Record<string, boolean>;
}

const HISTORY_LIMIT = 100;
/** Edits to the same field closer together than this undo as one step. */
const MERGE_MS = 1000;

const clearedHistory = {
    past: [],
    future: [],
    historyKey: null,
    historyAt: 0,
} satisfies Partial<IResumeStore>;

interface IResumeStore {
    resume: IResume | null;
    source: TResumeSource | null;
    saveState: TSaveState;
    saveError: string | null;
    /** Open sections by dotted path (`"2.0"`); UI-only, never persisted. */
    expanded: Record<string, boolean>;
    /** UI-only, never persisted. */
    focusedText: IFocusedText | null;
    textMode: TTextMode;
    /** Undo and redo stacks, oldest first; UI-only, never persisted. */
    past: ISnapshot[];
    future: ISnapshot[];
    /** The last edit's merge key and time, so typing undoes as one step. */
    historyKey: string | null;
    historyAt: number;
    undo(): void;
    redo(): void;
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
    setFocusedText(focused: IFocusedText | null): void;
    setTextMode(mode: TTextMode): void;
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
            focusedText: null,
            textMode: "formatted",
            ...clearedHistory,

            undo: () =>
                set((s) => {
                    const previous = s.past.at(-1);
                    if (!previous || !s.resume) return {};
                    return {
                        ...previous,
                        past: s.past.slice(0, -1),
                        future: [snapshot(s), ...s.future],
                        historyKey: null,
                        saveState: "dirty",
                        focusedText: null,
                    };
                }),
            redo: () =>
                set((s) => {
                    const next = s.future[0];
                    if (!next || !s.resume) return {};
                    return {
                        ...next,
                        past: [...s.past, snapshot(s)],
                        future: s.future.slice(1),
                        historyKey: null,
                        saveState: "dirty",
                        focusedText: null,
                    };
                }),

            load: (resume, source) =>
                set({
                    resume,
                    source,
                    saveState: "clean",
                    saveError: null,
                    expanded: {},
                    ...clearedHistory,
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
                    ...clearedHistory,
                }),

            setFilename: (filename) =>
                edit(set, (r) => ({ ...r, filename }), "filename"),

            updateSection: (path, patch) =>
                edit(
                    set,
                    (r) => updateSection(r, path, patch),
                    onlyKey(patch, "title") && `title:${path.join(".")}`,
                ),
            addSection: (parentPath, section) =>
                edit(set, (r) => addSection(r, parentPath, section)),
            removeSection: (path) =>
                set((s) => {
                    if (!s.resume) return {};
                    const resume = removeSection(s.resume, path);
                    const removed = path[path.length - 1];
                    return {
                        ...record(s),
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
                    if (!moved) return {};
                    return {
                        ...record(s),
                        resume,
                        saveState: "dirty",
                        expanded: remapExpanded(s.expanded, parent, (i) =>
                            i === from ? to : i === to ? from : i,
                        ),
                    };
                }),
            updateText: (path, index, patch) =>
                edit(
                    set,
                    (r) => updateText(r, path, index, patch),
                    onlyKey(patch, "text") && `text:${path.join(".")}:${index}`,
                ),
            addText: (path, text) => edit(set, (r) => addText(r, path, text)),
            removeText: (path, index) =>
                edit(set, (r) => removeText(r, path, index)),
            setExpanded: (path, open) =>
                set((s) => ({
                    expanded: { ...s.expanded, [path.join(".")]: open },
                })),
            setFocusedText: (focusedText) => set({ focusedText }),
            setTextMode: (textMode) => set({ textMode, focusedText: null }),

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
            partialize: ({ resume, source, saveState, textMode }) => ({
                resume,
                source,
                textMode,
                saveState: saveState === "saving" ? "dirty" : saveState,
            }),
        },
    ),
);

function edit(
    set: (fn: (s: IResumeStore) => Partial<IResumeStore>) => void,
    fn: (resume: IResume) => IResume,
    mergeKey?: string | false,
): void {
    set((s) =>
        s.resume
            ? {
                  ...record(s, mergeKey || undefined),
                  resume: fn(s.resume),
                  saveState: "dirty",
              }
            : {},
    );
}

function snapshot(s: IResumeStore): ISnapshot {
    return { resume: s.resume!, expanded: s.expanded };
}

/**
 * The history update for an edit about to replace `s.resume`. Edits that
 * share a merge key within `MERGE_MS` of each other fold into one step.
 */
function record(s: IResumeStore, mergeKey?: string): Partial<IResumeStore> {
    const now = Date.now();
    const merge =
        mergeKey !== undefined &&
        mergeKey === s.historyKey &&
        now - s.historyAt < MERGE_MS;
    return {
        past:
            merge || !s.resume
                ? s.past
                : [...s.past, snapshot(s)].slice(-HISTORY_LIMIT),
        future: [],
        historyKey: mergeKey ?? null,
        historyAt: now,
    };
}

function onlyKey(patch: object, key: string): boolean {
    const keys = Object.keys(patch);
    return keys.length === 1 && keys[0] === key;
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

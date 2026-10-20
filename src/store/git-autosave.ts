import type { StoreApi } from "zustand";
import type {
    TAutosaveOutcome,
    TResumeSource,
    TSaveState,
} from "./useResumeStore";

interface IGitAutosaveState {
    resume: unknown;
    source: TResumeSource | null;
    saveState: TSaveState;
    autosave(): Promise<TAutosaveOutcome>;
}

type IEventSource = Pick<
    EventTarget,
    "addEventListener" | "removeEventListener"
>;

export interface IGitAutosaveOptions {
    /** Quiet time after the last change before pushing. */
    debounceMs?: number;
    /** Pushes never start closer together than this; also the longest a change waits. */
    minIntervalMs?: number;
    maxBackoffMs?: number;
    now?: () => number;
    setTimer?: (fn: () => void, ms: number) => unknown;
    clearTimer?: (handle: unknown) => void;
    win?: IEventSource;
    doc?: IEventSource & { hidden: boolean };
}

/**
 * Pushes git-backed resumes to their session branch while they are dirty:
 * about 30s after the last change, at most once a minute, and at the latest
 * a minute after the first unsaved change. Failures retry with backoff; an
 * auth failure stops until another document is loaded. Local sources are
 * ignored. Returns a function that flushes anything pending and stops.
 */
export function startGitAutosave(
    store: Pick<StoreApi<IGitAutosaveState>, "getState" | "subscribe">,
    {
        debounceMs = 30_000,
        minIntervalMs = 60_000,
        maxBackoffMs = 240_000,
        now = Date.now,
        setTimer = (fn, ms) => setTimeout(fn, ms),
        clearTimer = (handle) => clearTimeout(handle as number),
        win = typeof window === "undefined" ? undefined : window,
        doc = typeof document === "undefined" ? undefined : document,
    }: IGitAutosaveOptions = {},
): () => void {
    let timer: unknown;
    let pending = false;
    let running = false;
    let stopped = false;
    let failures = 0;
    let firstChangeAt = 0;
    let lastChangeAt = 0;
    let lastAttemptAt = -Infinity;
    let source = store.getState().source;

    const isGit = (s: IGitAutosaveState) =>
        s.resume !== null && s.source?.kind === "git";

    function schedule(retry = false) {
        if (stopped) return;
        if (!pending) {
            pending = true;
            firstChangeAt = now();
        }
        clearTimer(timer);
        const t = now();
        const quiet = Math.min(
            lastChangeAt + debounceMs,
            firstChangeAt + minIntervalMs,
        );
        const backoff = retry
            ? lastAttemptAt + Math.min(maxBackoffMs, debounceMs * 2 ** failures)
            : 0;
        const due = Math.max(quiet, lastAttemptAt + minIntervalMs, backoff);
        timer = setTimer(() => void run(), Math.max(0, due - t));
    }

    async function run() {
        clearTimer(timer);
        if (running || stopped) return;
        const state = store.getState();
        pending = false;
        if (!isGit(state) || state.saveState !== "dirty") return;
        running = true;
        lastAttemptAt = now();
        let outcome: TAutosaveOutcome = "skip";
        try {
            outcome = await state.autosave();
        } finally {
            running = false;
        }
        if (outcome === "auth") {
            stopped = true;
        } else if (outcome === "retry") {
            failures++;
            firstChangeAt = now();
            schedule(true);
        } else {
            failures = 0;
            const next = store.getState();
            if (isGit(next) && next.saveState === "dirty") {
                firstChangeAt = lastChangeAt;
                schedule();
            }
        }
    }

    function flush() {
        if (!pending || stopped) return;
        clearTimer(timer);
        void run();
    }

    const unsubscribe = store.subscribe((state, prev) => {
        if (state.source !== source) {
            // A different document: start fresh.
            source = state.source;
            stopped = false;
            failures = 0;
            pending = false;
            clearTimer(timer);
        }
        if (!isGit(state) || state.saveState !== "dirty") return;
        if (state.resume !== prev.resume || prev.saveState === "saving") {
            lastChangeAt = now();
            if (!running) schedule();
            else pending = true;
        }
    });
    if (isGit(store.getState()) && store.getState().saveState === "dirty") {
        lastChangeAt = now();
        schedule();
    }

    const onHide = () => {
        if (doc?.hidden) flush();
    };
    const onPageHide = () => flush();
    doc?.addEventListener("visibilitychange", onHide);
    win?.addEventListener("pagehide", onPageHide);

    return () => {
        flush();
        stopped = true;
        clearTimer(timer);
        unsubscribe();
        doc?.removeEventListener("visibilitychange", onHide);
        win?.removeEventListener("pagehide", onPageHide);
    };
}

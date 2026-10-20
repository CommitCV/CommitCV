import type { StoreApi } from "zustand";
import type { TResumeSource, TSaveState } from "./useResumeStore";

interface IAutosaveState {
    resume: unknown;
    source: TResumeSource | null;
    saveState: TSaveState;
    save(message?: string): Promise<void>;
}

type IEventSource = Pick<
    EventTarget,
    "addEventListener" | "removeEventListener"
>;

export interface IAutosaveOptions {
    delayMs?: number;
    setTimer?: (fn: () => void, ms: number) => unknown;
    clearTimer?: (handle: unknown) => void;
    /** Sources of `pagehide` and `visibilitychange`; default to the browser's. */
    win?: IEventSource;
    doc?: IEventSource & { hidden: boolean };
}

/**
 * Saves local resumes shortly after each change, with no UI. Returns a
 * function that flushes anything pending and stops. GitHub sources are never
 * touched; they commit only on request.
 */
export function startLocalAutosave(
    store: Pick<StoreApi<IAutosaveState>, "getState" | "subscribe">,
    {
        delayMs = 1000,
        setTimer = (fn, ms) => setTimeout(fn, ms),
        clearTimer = (handle) => clearTimeout(handle as number),
        win = typeof window === "undefined" ? undefined : window,
        doc = typeof document === "undefined" ? undefined : document,
    }: IAutosaveOptions = {},
): () => void {
    let timer: unknown;
    let pending = false;

    const isLocal = (s: IAutosaveState) =>
        s.resume !== null && (!s.source || s.source.kind === "local");

    function flush() {
        if (!pending) return;
        pending = false;
        clearTimer(timer);
        const state = store.getState();
        if (isLocal(state) && state.saveState === "dirty") void state.save();
    }

    function schedule() {
        pending = true;
        clearTimer(timer);
        timer = setTimer(flush, delayMs);
    }

    const unsubscribe = store.subscribe((state, prev) => {
        if (!isLocal(state) || state.saveState !== "dirty") return;
        // A change, or an edit that landed while a save was in flight.
        if (state.resume !== prev.resume || prev.saveState === "saving") {
            schedule();
        }
    });
    if (isLocal(store.getState()) && store.getState().saveState === "dirty") {
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
        unsubscribe();
        doc?.removeEventListener("visibilitychange", onHide);
        win?.removeEventListener("pagehide", onPageHide);
    };
}

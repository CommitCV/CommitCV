import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStore } from "zustand/vanilla";
import { startLocalAutosave } from "./local-autosave";
import type { TResumeSource, TSaveState } from "./useResumeStore";

interface IState {
    resume: object | null;
    source: TResumeSource | null;
    saveState: TSaveState;
    save: () => Promise<void>;
}

function setup(initial: Partial<IState> = {}) {
    const save = vi.fn(async () => {});
    const store = createStore<IState>(() => ({
        resume: {},
        source: { kind: "local", id: "r1" },
        saveState: "clean",
        save,
        ...initial,
    }));
    const win = new EventTarget();
    const doc = Object.assign(new EventTarget(), { hidden: false });
    const stop = startLocalAutosave(store, { win, doc });
    const edit = () =>
        store.setState({ resume: {}, saveState: "dirty" as TSaveState });
    return { store, save, win, doc, stop, edit };
}

describe("startLocalAutosave", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("saves once after a burst of edits", () => {
        const { save, edit } = setup();
        edit();
        vi.advanceTimersByTime(600);
        edit();
        vi.advanceTimersByTime(600);
        expect(save).not.toHaveBeenCalled();
        vi.advanceTimersByTime(500);
        expect(save).toHaveBeenCalledTimes(1);
    });

    it("saves a brand new resume on its first edit, not before", () => {
        const { save, edit } = setup({ source: null });
        vi.advanceTimersByTime(5000);
        expect(save).not.toHaveBeenCalled();
        edit();
        vi.advanceTimersByTime(1000);
        expect(save).toHaveBeenCalledTimes(1);
    });

    it("flushes pending edits on pagehide", () => {
        const { save, edit, win } = setup();
        edit();
        win.dispatchEvent(new Event("pagehide"));
        expect(save).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(2000);
        expect(save).toHaveBeenCalledTimes(1);
    });

    it("flushes only when the page becomes hidden", () => {
        const { save, edit, doc } = setup();
        edit();
        doc.dispatchEvent(new Event("visibilitychange"));
        expect(save).not.toHaveBeenCalled();
        doc.hidden = true;
        doc.dispatchEvent(new Event("visibilitychange"));
        expect(save).toHaveBeenCalledTimes(1);
    });

    it("flushes and stops when unsubscribed", () => {
        const { save, edit, stop } = setup();
        edit();
        stop();
        expect(save).toHaveBeenCalledTimes(1);
        edit();
        vi.advanceTimersByTime(2000);
        expect(save).toHaveBeenCalledTimes(1);
    });

    it("retries on the next change after a failure", () => {
        const { save, edit, store } = setup();
        edit();
        vi.advanceTimersByTime(1000);
        store.setState({ saveState: "error" });
        vi.advanceTimersByTime(5000);
        expect(save).toHaveBeenCalledTimes(1);
        edit();
        vi.advanceTimersByTime(1000);
        expect(save).toHaveBeenCalledTimes(2);
    });

    it("saves an edit that landed while a save was in flight", () => {
        const { save, store } = setup({ saveState: "saving" });
        store.setState({ saveState: "dirty" });
        vi.advanceTimersByTime(1000);
        expect(save).toHaveBeenCalledTimes(1);
    });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createStore } from "zustand/vanilla";
import { startGitAutosave } from "./git-autosave";
import type {
    TAutosaveOutcome,
    TResumeSource,
    TSaveState,
} from "./useResumeStore";

interface IState {
    resume: object | null;
    source: TResumeSource | null;
    saveState: TSaveState;
    autosave: () => Promise<TAutosaveOutcome>;
}

const GIT: TResumeSource = { kind: "git", connectionId: "c", path: "a.json" };
const s = (n: number) => n * 1000;

function setup(initial: Partial<IState> = {}) {
    const outcomes: TAutosaveOutcome[] = [];
    const autosave = vi.fn(async () => {
        const outcome = outcomes.shift() ?? "ok";
        if (outcome === "ok") store.setState({ saveState: "clean" });
        return outcome;
    });
    const store = createStore<IState>(() => ({
        resume: {},
        source: GIT,
        saveState: "clean",
        autosave,
        ...initial,
    }));
    const win = new EventTarget();
    const doc = Object.assign(new EventTarget(), { hidden: false });
    const stop = startGitAutosave(store, { win, doc });
    const edit = () =>
        store.setState({ resume: {}, saveState: "dirty" as TSaveState });
    const advance = (ms: number) => vi.advanceTimersByTimeAsync(ms);
    return { store, autosave, outcomes, win, doc, stop, edit, advance };
}

describe("startGitAutosave", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("pushes once, 30s after the last change", async () => {
        const { autosave, edit, advance } = setup();
        edit();
        await advance(s(20));
        edit();
        await advance(s(29));
        expect(autosave).not.toHaveBeenCalled();
        await advance(s(1));
        expect(autosave).toHaveBeenCalledTimes(1);
    });

    it("does not push a clean document", async () => {
        const { autosave, advance } = setup();
        await advance(s(300));
        expect(autosave).not.toHaveBeenCalled();
    });

    it("waits out the 60s floor between pushes", async () => {
        const { autosave, edit, advance } = setup();
        edit();
        await advance(s(30));
        expect(autosave).toHaveBeenCalledTimes(1);
        edit();
        await advance(s(30));
        expect(autosave).toHaveBeenCalledTimes(1);
        await advance(s(30));
        expect(autosave).toHaveBeenCalledTimes(2);
    });

    it("pushes within a minute even while the user keeps typing", async () => {
        const { autosave, edit, advance } = setup();
        for (let i = 0; i < 7; i++) {
            edit();
            await advance(s(10));
        }
        expect(autosave).toHaveBeenCalledTimes(1);
    });

    it("flushes immediately on pagehide and when hidden", async () => {
        const { autosave, edit, win, doc, advance } = setup();
        edit();
        win.dispatchEvent(new Event("pagehide"));
        expect(autosave).toHaveBeenCalledTimes(1);
        await advance(0);
        edit();
        doc.dispatchEvent(new Event("visibilitychange"));
        expect(autosave).toHaveBeenCalledTimes(1);
        doc.hidden = true;
        doc.dispatchEvent(new Event("visibilitychange"));
        expect(autosave).toHaveBeenCalledTimes(2);
    });

    it("flushes and stops when unsubscribed", async () => {
        const { autosave, edit, stop, advance } = setup();
        edit();
        stop();
        expect(autosave).toHaveBeenCalledTimes(1);
        edit();
        await advance(s(300));
        expect(autosave).toHaveBeenCalledTimes(1);
    });

    it("retries with growing backoff, capped at 4 minutes", async () => {
        const { autosave, outcomes, edit, advance } = setup();
        outcomes.push("retry", "retry", "retry", "retry");
        edit();
        await advance(s(30)); // attempt 1 at 30s
        expect(autosave).toHaveBeenCalledTimes(1);
        await advance(s(59));
        expect(autosave).toHaveBeenCalledTimes(1);
        await advance(s(1)); // attempt 2 at 90s
        expect(autosave).toHaveBeenCalledTimes(2);
        await advance(s(119));
        expect(autosave).toHaveBeenCalledTimes(2);
        await advance(s(1)); // attempt 3 at 210s
        expect(autosave).toHaveBeenCalledTimes(3);
        await advance(s(239));
        expect(autosave).toHaveBeenCalledTimes(3);
        await advance(s(1)); // attempt 4 at 450s
        expect(autosave).toHaveBeenCalledTimes(4);
        await advance(s(239));
        expect(autosave).toHaveBeenCalledTimes(4);
        await advance(s(1)); // capped: attempt 5 at 690s, then succeeds
        expect(autosave).toHaveBeenCalledTimes(5);
        await advance(s(600));
        expect(autosave).toHaveBeenCalledTimes(5);
    });

    it("stops retrying after an auth failure until another document loads", async () => {
        const { autosave, outcomes, edit, advance, store } = setup();
        outcomes.push("auth");
        edit();
        await advance(s(30));
        expect(autosave).toHaveBeenCalledTimes(1);
        edit();
        await advance(s(600));
        expect(autosave).toHaveBeenCalledTimes(1);
        store.setState({ source: { ...GIT, path: "b.json" } });
        edit();
        await advance(s(60));
        expect(autosave).toHaveBeenCalledTimes(2);
    });

    it("never touches local or new resumes", async () => {
        for (const source of [{ kind: "local" as const, id: "r" }, null]) {
            const { autosave, edit, win, advance } = setup({ source });
            edit();
            win.dispatchEvent(new Event("pagehide"));
            await advance(s(300));
            expect(autosave).not.toHaveBeenCalled();
        }
    });

    it("pushes an edit that landed during an in-flight push", async () => {
        const { autosave, store, advance } = setup({ saveState: "saving" });
        store.setState({ saveState: "dirty" });
        await advance(s(30));
        expect(autosave).toHaveBeenCalledTimes(1);
    });

    it("goes quiet once a manual commit leaves the document clean", async () => {
        const { autosave, store, edit, advance } = setup();
        edit();
        await advance(s(10));
        store.setState({ saveState: "clean" }); // commit squashed the session
        await advance(s(300));
        expect(autosave).not.toHaveBeenCalled();
    });
});

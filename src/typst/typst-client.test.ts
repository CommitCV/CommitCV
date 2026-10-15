import { afterEach, describe, expect, it, vi } from "vitest";
import { TypstClient } from "./typst-client";

class FakeWorker {
    static instances: FakeWorker[] = [];
    onmessage: ((event: { data: unknown }) => void) | null = null;
    onerror: (() => void) | null = null;
    sent: unknown[] = [];
    terminated = false;

    constructor(url: URL, options: unknown) {
        void url;
        void options;
        FakeWorker.instances.push(this);
    }

    postMessage(message: unknown) {
        this.sent.push(message);
    }

    terminate() {
        this.terminated = true;
    }

    /** Delivers a worker reply, as the browser would. */
    reply(message: unknown) {
        this.onmessage?.({ data: message });
    }

    crash() {
        this.onerror?.();
    }
}

function makeClient(): TypstClient {
    vi.stubGlobal("Worker", FakeWorker);
    return new TypstClient();
}

afterEach(() => {
    FakeWorker.instances = [];
    vi.unstubAllGlobals();
});

describe("TypstClient", () => {
    it("routes each reply to its own caller", async () => {
        const client = makeClient();
        const svg = client.renderSvg("#a");
        const pdf = client.renderPdf("#b");
        const worker = FakeWorker.instances[0]!;

        expect(worker.sent).toEqual([{ id: 1, kind: "svg", source: "#a" }]);
        worker.reply({ id: 1, ok: true, result: "<a/>" });
        expect(worker.sent).toEqual([
            { id: 1, kind: "svg", source: "#a" },
            { id: 2, kind: "pdf", source: "#b" },
        ]);

        const bytes = new Uint8Array([1, 2, 3]);
        worker.reply({ id: 2, ok: true, result: bytes });
        await expect(svg).resolves.toBe("<a/>");
        await expect(pdf).resolves.toEqual(bytes);
    });

    it("replaces a queued preview render with the newest one", async () => {
        const client = makeClient();
        const first = client.renderSvg("#first");
        const stale = client.renderSvg("#stale");
        const latest = client.renderSvg("#latest");
        const worker = FakeWorker.instances[0]!;

        await expect(stale).rejects.toThrow(/replaced by a newer render/);
        worker.reply({ id: 1, ok: true, result: "<first/>" });
        expect(worker.sent).toEqual([
            { id: 1, kind: "svg", source: "#first" },
            { id: 3, kind: "svg", source: "#latest" },
        ]);
        worker.reply({ id: 3, ok: true, result: "<latest/>" });

        await expect(first).resolves.toBe("<first/>");
        await expect(latest).resolves.toBe("<latest/>");
    });

    it("keeps pdf requests when a preview render replaces itself", async () => {
        const client = makeClient();
        const first = client.renderSvg("#a");
        const pdf = client.renderPdf("#pdf");
        const latest = client.renderSvg("#b");
        const worker = FakeWorker.instances[0]!;

        worker.reply({ id: 1, ok: true, result: "<a/>" });
        worker.reply({ id: 2, ok: true, result: new Uint8Array([9]) });
        worker.reply({ id: 3, ok: true, result: "<b/>" });

        expect(worker.sent).toEqual([
            { id: 1, kind: "svg", source: "#a" },
            { id: 2, kind: "pdf", source: "#pdf" },
            { id: 3, kind: "svg", source: "#b" },
        ]);
        await expect(first).resolves.toBe("<a/>");
        await expect(pdf).resolves.toEqual(new Uint8Array([9]));
        await expect(latest).resolves.toBe("<b/>");
    });

    it("passes compile errors through", async () => {
        const client = makeClient();
        const svg = client.renderSvg("#bad");
        FakeWorker.instances[0]!.reply({
            id: 1,
            ok: false,
            error: "Typst compilation failed",
        });
        await expect(svg).rejects.toThrow(/Typst compilation failed/);
    });

    it("recovers with a fresh worker after a crash", async () => {
        const client = makeClient();
        const first = client.renderSvg("#a");
        const queued = client.renderSvg("#b");
        const worker = FakeWorker.instances[0]!;

        worker.crash();
        await expect(first).rejects.toThrow(/crashed/);
        await expect(queued).rejects.toThrow(/crashed/);
        expect(worker.terminated).toBe(true);

        const revived = client.renderSvg("#c");
        const fresh = FakeWorker.instances[1]!;
        expect(fresh).not.toBe(worker);
        expect(fresh.sent).toEqual([{ id: 3, kind: "svg", source: "#c" }]);
        fresh.reply({ id: 3, ok: true, result: "<c/>" });
        await expect(revived).resolves.toBe("<c/>");
    });
});

import { describe, expect, it, vi } from "vitest";
import type { IResume } from "@resume/resume";
import type { IThumbnail } from "@storage/idb-resume-storage";
import { createThumbnailService, hashResume } from "./thumbnail-service";

function makeResume(note: string): IResume {
    return {
        filename: "r",
        date: "02-26-26",
        schema_version: 1,
        sections: [
            {
                title: "T",
                type: "header",
                toggled: true,
                content: [{ text: note, flags: [], toggled: true }],
                subsections: [],
            },
        ],
    };
}

function setup() {
    const store = new Map<string, IThumbnail>();
    const cache = {
        loadThumbnail: async (id: string) => store.get(id),
        saveThumbnail: async (id: string, hash: string, blob: Blob) => {
            store.set(id, { hash, blob });
        },
    };
    const render = vi.fn(async () => new Blob(["img"]));
    return {
        store,
        render,
        service: createThumbnailService({ cache, render }),
    };
}

describe("hashResume", () => {
    it("is stable and content-sensitive", async () => {
        expect(await hashResume(makeResume("a"))).toBe(
            await hashResume(makeResume("a")),
        );
        expect(await hashResume(makeResume("a"))).not.toBe(
            await hashResume(makeResume("b")),
        );
    });
});

describe("ensureThumbnail", () => {
    it("renders once, then serves the cache for unchanged content", async () => {
        const { service, render } = setup();
        await service.ensureThumbnail("a", makeResume("a"));
        await service.ensureThumbnail("a", makeResume("a"));
        expect(render).toHaveBeenCalledTimes(1);
    });

    it("re-renders when the content changes", async () => {
        const { service, render, store } = setup();
        await service.ensureThumbnail("a", makeResume("a"));
        const first = store.get("a")!.hash;
        await service.ensureThumbnail("a", makeResume("b"));
        expect(render).toHaveBeenCalledTimes(2);
        expect(store.get("a")!.hash).not.toBe(first);
    });

    it("dedupes concurrent calls for the same id", async () => {
        const { service, render } = setup();
        const resume = makeResume("a");
        await Promise.all([
            service.ensureThumbnail("a", resume),
            service.ensureThumbnail("a", resume),
        ]);
        expect(render).toHaveBeenCalledTimes(1);
    });

    it("renders a newer resume requested while an older one is in flight", async () => {
        const { service, render, store } = setup();
        let release!: () => void;
        render.mockImplementationOnce(
            () => new Promise((r) => (release = () => r(new Blob(["old"])))),
        );
        const first = service.ensureThumbnail("a", makeResume("v1"));
        const second = service.ensureThumbnail("a", makeResume("v2"));
        await vi.waitFor(() => expect(render).toHaveBeenCalledTimes(1));
        release();
        await Promise.all([first, second]);

        expect(render).toHaveBeenCalledTimes(2);
        expect(store.get("a")!.hash).toBe(await hashResume(makeResume("v2")));
    });

    it("resolves undefined instead of throwing when rendering fails", async () => {
        const { service, render, store } = setup();
        render.mockRejectedValueOnce(new Error("compile"));
        expect(await service.ensureThumbnail("a", makeResume("a"))).toBe(
            undefined,
        );
        expect(store.size).toBe(0);
        expect(
            await service.ensureThumbnail("a", makeResume("a")),
        ).toBeInstanceOf(Blob);
    });
});

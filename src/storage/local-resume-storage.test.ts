import { describe, expect, it } from "vitest";
import type { IResume } from "@resume/resume";
import { ResumeParseError } from "@resume/parse-resume";
import { LocalResumeStorage } from "./local-resume-storage";

function fakeBrowserStorage(): Storage {
    const data = new Map<string, string>();
    return {
        get length() {
            return data.size;
        },
        key: (i) => [...data.keys()][i] ?? null,
        getItem: (k) => data.get(k) ?? null,
        setItem: (k, v) => void data.set(k, v),
        removeItem: (k) => void data.delete(k),
        clear: () => data.clear(),
    } as Storage;
}

function makeResume(filename: string, note: string): IResume {
    return {
        filename,
        date: "02-26-26",
        schema_version: 1,
        sections: [
            {
                title: "Travis",
                type: "header",
                toggled: true,
                content: [{ text: note, flags: [], toggled: true }],
                subsections: [],
            },
        ],
    };
}

describe("LocalResumeStorage", () => {
    it("round-trips save, list, load and remove", async () => {
        const browser = fakeBrowserStorage();
        const storage = new LocalResumeStorage(browser);

        await storage.save("r1", makeResume("first", "hello"));
        await storage.save("r2", makeResume("second", "Résumé 🚀"));

        expect(await storage.list()).toHaveLength(2);
        expect((await storage.load("r1")).filename).toBe("first");
        expect((await storage.load("r2")).sections[0].content[0].text).toBe(
            "Résumé 🚀",
        );

        await storage.remove("r1");
        expect(await storage.list()).toHaveLength(1);
        await expect(storage.load("r1")).rejects.toThrow(/no saved resume/);
    });

    it("keeps non-ASCII text intact through JSON storage", async () => {
        const storage = new LocalResumeStorage(fakeBrowserStorage());
        await storage.save("u", makeResume("Résumé 🚀", "Café"));
        expect((await storage.load("u")).filename).toBe("Résumé 🚀");
    });

    it("skips corrupted entries in list but fails loudly in load", async () => {
        const browser = fakeBrowserStorage();
        browser.setItem("commitcv:resume:bad", "not json at all");
        browser.setItem(
            "commitcv:resume:good",
            JSON.stringify(makeResume("good", "x")),
        );
        const storage = new LocalResumeStorage(browser);

        expect(await storage.list()).toHaveLength(1);
        await expect(storage.load("bad")).rejects.toThrow(ResumeParseError);
    });

    it("ignores keys belonging to other apps", async () => {
        const browser = fakeBrowserStorage();
        browser.setItem("other:app:thing", "{}");
        const storage = new LocalResumeStorage(browser);
        expect(await storage.list()).toEqual([]);
    });
});

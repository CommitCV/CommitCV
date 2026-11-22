import type { IResume } from "./resume";

type TSections = IResume["sections"];

const same = (a: unknown, b: unknown) =>
    JSON.stringify(a) === JSON.stringify(b);

/** The side that changed, or `undefined` when both changed differently. */
function pick<T>(base: T, ours: T, theirs: T): { value: T } | undefined {
    if (same(ours, theirs) || same(base, theirs)) return { value: ours };
    if (same(base, ours)) return { value: theirs };
    return undefined;
}

function mergeSections(
    base: TSections,
    ours: TSections,
    theirs: TSections,
): TSections | null {
    const whole = pick(base, ours, theirs);
    if (whole) return whole.value;
    // Both sides changed the list; only merge when it kept its shape.
    if (base.length !== ours.length || base.length !== theirs.length) {
        return null;
    }
    const merged: TSections = [];
    for (const [i, section] of base.entries()) {
        const p = pick(section, ours[i], theirs[i]);
        if (!p) return null;
        merged.push(p.value);
    }
    return merged;
}

/**
 * Three-way merge of one resume: top-level fields one by one, sections as
 * whole units matched by index. Edits to different sections merge. Anything
 * both sides touched, or an add/remove/reorder on one side while the other
 * also changed sections, returns null so the caller can ask the user.
 */
export function mergeResume(
    base: IResume,
    ours: IResume,
    theirs: IResume,
): IResume | null {
    const sections = mergeSections(
        base.sections,
        ours.sections,
        theirs.sections,
    );
    if (!sections) return null;
    const merged: Record<string, unknown> = {};
    const keys = new Set([...Object.keys(ours), ...Object.keys(theirs)]);
    keys.delete("sections");
    for (const k of keys) {
        const key = k as keyof IResume;
        const p = pick(base[key], ours[key], theirs[key]);
        if (!p) return null;
        if (p.value !== undefined) merged[k] = p.value;
    }
    return { ...ours, ...merged, sections } as IResume;
}

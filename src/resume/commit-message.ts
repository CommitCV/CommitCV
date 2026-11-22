import type { IResume, ISection } from "./resume";

const MAX_SUBJECT = 72;
const MAX_NAMES = 2;
const MAX_BODY_LINES = 20;
const MAX_LABEL = 30;

/**
 * Sections have no stable ids, so prev/next are matched in two passes:
 * 1. same type and same title (first unmatched prev wins, so duplicate
 *    titles pair up in order);
 * 2. leftovers of the same type are paired by position among the unmatched
 *    (k-th unmatched next with k-th unmatched prev), which reads as a rename.
 * Anything still unmatched is an add (next) or a remove (prev). The same
 * matching is used for subsections, whose changes roll up into the top-level
 * section.
 */
export function matchSections(prev: ISection[], next: ISection[]): number[] {
    const match = next.map(() => -1);
    const used = new Set<number>();
    next.forEach((n, i) => {
        const j = prev.findIndex(
            (p, k) => !used.has(k) && p.type === n.type && p.title === n.title,
        );
        if (j >= 0) {
            match[i] = j;
            used.add(j);
        }
    });
    const free = (list: ISection[], taken: (k: number) => boolean) =>
        list.map((_, k) => k).filter((k) => !taken(k));
    for (const type of new Set(next.map((s) => s.type))) {
        const ns = free(next, (k) => match[k] >= 0 || next[k].type !== type);
        const ps = free(prev, (k) => used.has(k) || prev[k].type !== type);
        ns.slice(0, ps.length).forEach((i, n) => {
            match[i] = ps[n];
            used.add(ps[n]);
        });
    }
    return match;
}

interface Change {
    kind: "edit" | "add" | "remove";
    where: string;
    label: string;
    line?: number;
}

interface SectionChange {
    name: string;
    isHeader: boolean;
    renamedFrom?: string;
    toggled?: boolean;
    changes: Change[];
}

interface Diff {
    created: boolean;
    added: ISection[];
    removed: ISection[];
    reordered: boolean;
    touched: SectionChange[];
}

/** Collapses whitespace and newlines so user text can't add lines. */
const flat = (s: string) => s.trim().replace(/\s+/g, " ");

const clip = (s: string) => {
    const t = flat(s);
    return t.length > MAX_LABEL ? `${t.slice(0, MAX_LABEL - 1)}…` : t;
};

const labelOf = (s: ISection) => clip(s.title || s.content[0]?.text || "entry");

function diffContent(prev: ISection, next: ISection, where: string): Change[] {
    const out: Change[] = [];
    const len = Math.max(prev.content.length, next.content.length);
    for (let i = 0; i < len; i++) {
        const p = prev.content[i];
        const n = next.content[i];
        const line = i + 1;
        if (!p && n)
            out.push({ kind: "add", where, label: clip(n.text), line });
        else if (p && !n)
            out.push({ kind: "remove", where, label: clip(p.text), line });
        else if (
            p.text !== n.text ||
            p.toggled !== n.toggled ||
            p.flags.join() !== n.flags.join()
        )
            out.push({ kind: "edit", where, label: clip(n.text), line });
    }
    return out;
}

function diffChildren(prev: ISection, next: ISection, where: string) {
    const out = diffContent(prev, next, where);
    const match = matchSections(prev.subsections, next.subsections);
    next.subsections.forEach((n, i) => {
        const p = prev.subsections[match[i]];
        const at = n.title ? `${where} > ${flat(n.title)}` : where;
        if (!p) {
            out.push({ kind: "add", where, label: labelOf(n) });
        } else {
            if (p.title !== n.title || p.toggled !== n.toggled)
                out.push({ kind: "edit", where, label: labelOf(n) });
            out.push(...diffChildren(p, n, at));
        }
    });
    prev.subsections.forEach((p, j) => {
        if (!match.includes(j))
            out.push({ kind: "remove", where, label: labelOf(p) });
    });
    return out;
}

function diff(prev: IResume | null, next: IResume): Diff {
    const result: Diff = {
        created: prev === null,
        added: [],
        removed: [],
        reordered: false,
        touched: [],
    };
    if (!prev) return result;
    const match = matchSections(prev.sections, next.sections);
    next.sections.forEach((n, i) => {
        const p = prev.sections[match[i]];
        if (!p) return void result.added.push(n);
        const sc: SectionChange = {
            name: flat(n.title),
            isHeader: n.type === "header",
            changes: diffChildren(p, n, flat(n.title).toLowerCase()),
        };
        if (p.title !== n.title) sc.renamedFrom = flat(p.title);
        if (p.toggled !== n.toggled) sc.toggled = n.toggled;
        if (sc.changes.length || sc.renamedFrom || sc.toggled !== undefined)
            result.touched.push(sc);
    });
    prev.sections.forEach((p, j) => {
        if (!match.includes(j)) result.removed.push(p);
    });
    const order = match.filter((j) => j >= 0);
    result.reordered = order.some((j, k) => k > 0 && j < order[k - 1]);
    return result;
}

const entries = (n: number) => `${n} ${n === 1 ? "entry" : "entries"}`;

function describeChanges(changes: Change[]): string {
    return (["edit", "add", "remove"] as const)
        .map((kind) => {
            const hits = changes.filter((c) => c.kind === kind);
            if (!hits.length) return "";
            return hits.length === 1 && kind !== "edit"
                ? `${kind} "${hits[0].label}"`
                : `${kind} ${entries(hits.length)}`;
        })
        .filter(Boolean)
        .join(", ");
}

function truncate(subject: string): string {
    return subject.length <= MAX_SUBJECT
        ? subject
        : `${subject.slice(0, MAX_SUBJECT - 1).trimEnd()}…`;
}

/** Subject line: <= 72 chars (longer ones are cut and end with "…"). */
export function generateCommitMessage(
    prev: IResume | null,
    next: IResume,
): string {
    const filename = flat(next.filename);
    const fallback = `update ${filename}`;
    const d = diff(prev, next);
    if (d.created) return `create ${filename}`;
    const names = [
        ...d.touched.map((t) => (t.isHeader ? "header" : t.name.toLowerCase())),
        ...[...d.added, ...d.removed].map((s) => flat(s.title).toLowerCase()),
    ];
    const count = d.touched.length + d.added.length + d.removed.length;
    if (count === 0)
        return truncate(d.reordered ? "reorder sections" : fallback);
    if (count === 1) {
        const [t] = d.touched;
        if (d.added[0])
            return truncate(`add section: ${flat(d.added[0].title)}`);
        if (d.removed[0])
            return truncate(`remove section: ${flat(d.removed[0].title)}`);
        if (t.isHeader && !t.renamedFrom && t.toggled === undefined)
            return "update header";
        if (!t.changes.length) {
            return truncate(
                t.renamedFrom !== undefined
                    ? `rename section: ${t.renamedFrom} -> ${t.name}`
                    : `toggle ${t.toggled ? "on" : "off"} section: ${t.name}`,
            );
        }
        const detail = t.isHeader ? "" : `: ${describeChanges(t.changes)}`;
        return truncate(`update ${names[0]}${detail}`);
    }
    const unique = [...new Set(names)];
    const shown = unique.slice(
        0,
        unique.length > MAX_NAMES + 1 ? MAX_NAMES : unique.length,
    );
    const more = unique.length - shown.length;
    return truncate(
        `update ${shown.join(", ")}${more > 0 ? `, +${more} more` : ""}`,
    );
}

/** Bullet list of every change, capped at 20 lines with a "...and N more" tail. */
export function generateCommitBody(
    prev: IResume | null,
    next: IResume,
): string {
    const d = diff(prev, next);
    const lines: string[] = [];
    if (d.created) return "";
    for (const s of d.added) lines.push(`- added section "${flat(s.title)}"`);
    for (const s of d.removed)
        lines.push(`- removed section "${flat(s.title)}"`);
    if (d.reordered) lines.push("- reordered sections");
    for (const t of d.touched) {
        const key = t.name.toLowerCase();
        if (t.renamedFrom !== undefined)
            lines.push(`- ${key}: renamed from "${t.renamedFrom}"`);
        if (t.toggled !== undefined)
            lines.push(`- ${key}: toggled ${t.toggled ? "on" : "off"}`);
        for (const c of t.changes) {
            const verb = { edit: "edited", add: "added", remove: "removed" }[
                c.kind
            ];
            const line = c.line ? ` (line ${c.line})` : "";
            lines.push(`- ${c.where}: ${verb} "${c.label}"${line}`);
        }
    }
    if (lines.length <= MAX_BODY_LINES) return lines.join("\n");
    const kept = lines.slice(0, MAX_BODY_LINES - 1);
    kept.push(`- ...and ${lines.length - kept.length} more`);
    return kept.join("\n");
}

import type { IResume, IResumeText, ISection, TSectionType } from "./resume";

/** Indexes through `sections`/`subsections`. `[]` is the top level. */
export type TSectionPath = number[];

export function sectionAt(
    resume: IResume,
    path: TSectionPath,
): ISection | null {
    let list = resume.sections;
    let section: ISection | null = null;
    for (const i of path) {
        section = list[i] ?? null;
        if (!section) return null;
        list = section.subsections;
    }
    return section;
}

export function updateSection(
    resume: IResume,
    path: TSectionPath,
    patch: Partial<ISection>,
): IResume {
    const next = clone(resume);
    const section = sectionAt(next, path);
    if (!section) throw new Error(`invalid section path: [${path}]`);
    Object.assign(section, patch);
    return next;
}

export function addSection(
    resume: IResume,
    parentPath: TSectionPath,
    section: ISection,
): IResume {
    const next = clone(resume);
    const parent = parentPath.length === 0 ? null : sectionAt(next, parentPath);
    if (parentPath.length !== 0 && !parent) {
        throw new Error(`invalid section path: [${parentPath}]`);
    }
    (parent ? parent.subsections : next.sections).push(section);
    return next;
}

export function removeSection(resume: IResume, path: TSectionPath): IResume {
    const next = clone(resume);
    containerOf(next, path).splice(path[path.length - 1], 1);
    return next;
}

/** Moves a section by one slot; out-of-range moves are no-ops. */
export function moveSection(
    resume: IResume,
    path: TSectionPath,
    offset: -1 | 1,
): IResume {
    const next = clone(resume);
    const list = containerOf(next, path);
    const i = path[path.length - 1];
    const j = i + offset;
    if (j < 0 || j >= list.length) return next;
    [list[i], list[j]] = [list[j], list[i]];
    return next;
}

/** Nodes with the same shape as sections, so moves can be mirrored on other trees. */
interface ITreeNode<T> {
    subsections: T[];
}

/**
 * Moves the section at `from` so it lands before the item at `toIndex` in
 * `toParent`'s list, with indexes taken before the move. Moving a section
 * into itself or its own subtree throws.
 */
export function moveSectionTo(
    resume: IResume,
    from: TSectionPath,
    toParent: TSectionPath,
    toIndex: number,
): IResume {
    const next = clone(resume);
    const moved = moveNode(next.sections, from, toParent, toIndex);
    moved.type = typeForDepth(moved.type, toParent.length > 0);
    return next;
}

/** Applies `moveSectionTo`'s reordering to any tree shaped like the sections. */
export function moveNode<T extends ITreeNode<T>>(
    roots: T[],
    from: TSectionPath,
    toParent: TSectionPath,
    toIndex: number,
): T {
    if (isPrefix(from, toParent)) {
        throw new Error(`cannot move [${from}] into itself`);
    }
    const source = listAt(roots, from.slice(0, -1));
    const target = listAt(roots, toParent);
    const fromIndex = from[from.length - 1];
    const node = source?.[fromIndex];
    if (!source || !target || !node) {
        throw new Error(`invalid move: [${from}] -> [${toParent}]/${toIndex}`);
    }
    // Lists are resolved up front, so leave a hole, insert, then close it.
    source[fromIndex] = null as unknown as T;
    target.splice(toIndex, 0, node);
    source.splice(source.indexOf(null as unknown as T), 1);
    return node;
}

/** Moves a text so it lands before `toIndex` in `toPath`'s content (indexes taken before the move). */
export function moveTextTo(
    resume: IResume,
    fromPath: TSectionPath,
    fromIndex: number,
    toPath: TSectionPath,
    toIndex: number,
): IResume {
    const next = clone(resume);
    const source = sectionAt(next, fromPath)?.content;
    const target = sectionAt(next, toPath)?.content;
    const text = source?.[fromIndex];
    if (!source || !target || !text) {
        throw new Error(
            `invalid text move: [${fromPath}]/${fromIndex} -> [${toPath}]/${toIndex}`,
        );
    }
    source[fromIndex] = null as unknown as IResumeText;
    target.splice(toIndex, 0, text);
    source.splice(source.indexOf(null as unknown as IResumeText), 1);
    return next;
}

export function updateText(
    resume: IResume,
    path: TSectionPath,
    index: number,
    patch: Partial<IResumeText>,
): IResume {
    const next = clone(resume);
    const section = sectionAt(next, path);
    if (!section || !section.content[index]) {
        throw new Error(`invalid text path: [${path}]/${index}`);
    }
    Object.assign(section.content[index], patch);
    return next;
}

export function addText(
    resume: IResume,
    path: TSectionPath,
    text: IResumeText,
): IResume {
    const next = clone(resume);
    const section = sectionAt(next, path);
    if (!section) throw new Error(`invalid section path: [${path}]`);
    section.content.push(text);
    return next;
}

export function removeText(
    resume: IResume,
    path: TSectionPath,
    index: number,
): IResume {
    const next = clone(resume);
    const section = sectionAt(next, path);
    if (!section || !section.content[index]) {
        throw new Error(`invalid text path: [${path}]/${index}`);
    }
    section.content.splice(index, 1);
    return next;
}

function nodeAt<T extends ITreeNode<T>>(
    roots: T[],
    path: TSectionPath,
): T | null {
    let list = roots;
    let node: T | null = null;
    for (const i of path) {
        node = list[i] ?? null;
        if (!node) return null;
        list = node.subsections;
    }
    return node;
}

function listAt<T extends ITreeNode<T>>(
    roots: T[],
    path: TSectionPath,
): T[] | null {
    return path.length === 0
        ? roots
        : (nodeAt(roots, path)?.subsections ?? null);
}

/** Whether `path` is `prefix` itself or lies inside it. */
export function isPrefix(prefix: TSectionPath, path: TSectionPath): boolean {
    return (
        prefix.length <= path.length &&
        prefix.every((index, depth) => path[depth] === index)
    );
}

/** Nested sections use the `sub-` variant of their type; top-level ones don't. */
function typeForDepth(type: TSectionType, nested: boolean): TSectionType {
    if (type === "header") return type;
    const base = type.replace(/^sub-/, "");
    return (nested ? `sub-${base}` : base) as TSectionType;
}

function clone(resume: IResume): IResume {
    return structuredClone(resume);
}

function containerOf(resume: IResume, path: TSectionPath): ISection[] {
    if (path.length === 0) {
        throw new Error("section path is empty");
    }
    const parent =
        path.length === 1 ? null : sectionAt(resume, path.slice(0, -1));
    if (path.length > 1 && !parent) {
        throw new Error(`invalid section path: [${path}]`);
    }
    return parent ? parent.subsections : resume.sections;
}

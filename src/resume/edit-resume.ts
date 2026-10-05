import type { IResume, IResumeText, ISection } from "./resume";

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

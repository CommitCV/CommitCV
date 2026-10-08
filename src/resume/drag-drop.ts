import { isPrefix, sectionAt, type TSectionPath } from "./edit-resume";
import type { IResume } from "./resume";

export type TDragItem =
    | { kind: "section"; path: TSectionPath }
    | { kind: "text"; path: TSectionPath; index: number };

export type TDropPosition = "before" | "after" | "inside";

export type TDropTarget =
    | { kind: "section"; path: TSectionPath; position: TDropPosition }
    | {
          kind: "text";
          path: TSectionPath;
          index: number;
          position: Exclude<TDropPosition, "inside">;
      };

export type TDropMove =
    | {
          kind: "section";
          from: TSectionPath;
          toParent: TSectionPath;
          toIndex: number;
      }
    | {
          kind: "text";
          fromPath: TSectionPath;
          fromIndex: number;
          toPath: TSectionPath;
          toIndex: number;
      };

/**
 * Turns a drag and its drop target into a move, or `null` when the drop
 * isn't allowed: sections can't land inside themselves, the header stays
 * first and takes no nested sections, and sections can't drop onto text.
 */
export function resolveDrop(
    resume: IResume,
    item: TDragItem,
    target: TDropTarget,
): TDropMove | null {
    const targetSection = sectionAt(resume, target.path);
    if (!targetSection) return null;

    if (item.kind === "text") {
        if (target.kind === "text") {
            return {
                kind: "text",
                fromPath: item.path,
                fromIndex: item.index,
                toPath: target.path,
                toIndex: target.index + (target.position === "after" ? 1 : 0),
            };
        }
        if (target.position !== "inside") return null;
        return {
            kind: "text",
            fromPath: item.path,
            fromIndex: item.index,
            toPath: target.path,
            toIndex: targetSection.content.length,
        };
    }

    if (target.kind === "text") return null;
    if (sectionAt(resume, item.path)?.type === "header") return null;
    if (isPrefix(item.path, target.path)) return null;
    if (targetSection.type === "header" && target.position !== "after") {
        return null;
    }

    if (target.position === "inside") {
        return {
            kind: "section",
            from: item.path,
            toParent: target.path,
            toIndex: targetSection.subsections.length,
        };
    }
    const index = target.path[target.path.length - 1];
    return {
        kind: "section",
        from: item.path,
        toParent: target.path.slice(0, -1),
        toIndex: index + (target.position === "after" ? 1 : 0),
    };
}

/** Whether a move puts the item back where it already is. */
export function isNoOpMove(move: TDropMove): boolean {
    const [fromParent, fromIndex, toParent, toIndex] =
        move.kind === "text"
            ? [move.fromPath, move.fromIndex, move.toPath, move.toIndex]
            : [
                  move.from.slice(0, -1),
                  move.from.at(-1)!,
                  move.toParent,
                  move.toIndex,
              ];
    return (
        fromParent.join(".") === toParent.join(".") &&
        (toIndex === fromIndex || toIndex === fromIndex + 1)
    );
}

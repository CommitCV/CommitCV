import { useEffect, useId, useRef, type ReactNode } from "react";
import Button from "@components/ui/button";
import type { ISessionInfo } from "@storage/git-resume-storage";
import { sessionAge } from "@store/open-git-resume";

export type TSessionView =
    | { kind: "list" }
    | { kind: "confirm"; action: "squash" | "discard"; info: ISessionInfo }
    | { kind: "local"; info: ISessionInfo }
    | { kind: "diverged"; info: ISessionInfo };

export interface ISessionDialogProps {
    path: string;
    sessions: ISessionInfo[];
    view: TSessionView;
    busy: boolean;
    error: string;
    now: number;
    onCancel: () => void;
    onBack: () => void;
    onContinue: (info: ISessionInfo) => void;
    onAskConfirm: (action: "squash" | "discard", info: ISessionInfo) => void;
    onSquash: (info: ISessionInfo) => void;
    onDiscard: (info: ISessionInfo) => void;
    onChoose: (info: ISessionInfo, choice: "mine" | "remote") => void;
}

const plural = (n: number) => `${n} change${n === 1 ? "" : "s"}`;

function Modal({
    title,
    onCancel,
    children,
}: {
    title: string;
    onCancel: () => void;
    children: ReactNode;
}) {
    const ref = useRef<HTMLDialogElement>(null);
    const titleId = useId();
    useEffect(() => {
        const dialog = ref.current;
        if (dialog && !dialog.open) dialog.showModal();
        return () => dialog?.close();
    }, []);
    return (
        <dialog
            ref={ref}
            aria-labelledby={titleId}
            onCancel={(event) => {
                event.preventDefault();
                onCancel();
            }}
            className="m-auto w-full max-w-lg rounded-lg border-2 border-border-light bg-light-50 p-6 text-light-950 backdrop:bg-black/50 dark:border-border-dark dark:bg-dark-300 dark:text-dark-950">
            <h2
                id={titleId}
                className="mb-3 text-xl font-bold tracking-tight">
                {title}
            </h2>
            {children}
        </dialog>
    );
}

/** The choices for a file with unsquashed sessions; state lives in the hook. */
export default function SessionDialog(props: ISessionDialogProps) {
    const { path, sessions, view, busy, error, now } = props;
    const actions = (children: ReactNode) => (
        <div className="mt-4 flex flex-wrap gap-2">{children}</div>
    );

    let title = `Unsaved session for ${path}`;
    let body: ReactNode;
    if (view.kind === "list") {
        body = (
            <>
                <p className="mb-3 text-sm text-light-700 dark:text-dark-700">
                    Changes from an earlier visit are saved on a session branch
                    but not committed yet. Choose what to do before editing.
                </p>
                <ul className="space-y-3">
                    {sessions.map((info) => (
                        <li
                            key={info.branch}
                            aria-label={info.branch}
                            className="rounded-md border border-border-light p-3 dark:border-border-dark">
                            <p className="text-sm">
                                <span className="font-semibold">
                                    Last activity{" "}
                                    {sessionAge(now - info.lastCommit.date)}
                                </span>
                                {": "}
                                {info.lastCommit.message} (
                                {plural(info.aheadBy)})
                            </p>
                            {actions(
                                <>
                                    <Button
                                        type="button"
                                        size="sm"
                                        disabled={busy}
                                        onClick={() => props.onContinue(info)}>
                                        Continue session
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="secondary"
                                        disabled={busy}
                                        onClick={() =>
                                            props.onAskConfirm("squash", info)
                                        }>
                                        Squash it now
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="secondary"
                                        disabled={busy}
                                        onClick={() =>
                                            props.onAskConfirm("discard", info)
                                        }>
                                        Discard session
                                    </Button>
                                </>,
                            )}
                        </li>
                    ))}
                </ul>
                {actions(
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={props.onCancel}>
                        Cancel
                    </Button>,
                )}
            </>
        );
    } else if (view.kind === "confirm") {
        const { info } = view;
        const squash = view.action === "squash";
        title = squash ? "Squash this session?" : "Discard this session?";
        body = (
            <>
                <p className="text-sm">
                    {squash
                        ? `This commits ${path} to the default branch as one commit and deletes the session branch. Local edits that were never saved to the session are included.`
                        : `This deletes the session branch (${plural(info.aheadBy)}) from the repository and this browser, and opens the committed version. It cannot be undone.`}
                </p>
                {actions(
                    <>
                        <Button
                            type="button"
                            size="sm"
                            disabled={busy}
                            onClick={() =>
                                squash
                                    ? props.onSquash(info)
                                    : props.onDiscard(info)
                            }>
                            {squash ? "Yes, squash" : "Yes, discard"}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={props.onBack}>
                            Back
                        </Button>
                    </>,
                )}
            </>
        );
    } else {
        const { info } = view;
        const diverged = view.kind === "diverged";
        title = diverged
            ? "This session was updated elsewhere"
            : "You have unsaved local edits";
        body = (
            <>
                <p className="text-sm">
                    {diverged
                        ? "Another device pushed this session after you last did. Keeping your version overwrites theirs."
                        : "Edits from your last visit never reached the session. You can use them or take the session as saved."}
                </p>
                {actions(
                    <>
                        <Button
                            type="button"
                            size="sm"
                            disabled={busy}
                            onClick={() =>
                                props.onChoose(
                                    info,
                                    diverged ? "remote" : "mine",
                                )
                            }>
                            {diverged
                                ? "Use remote version"
                                : "Use my unsaved local edits"}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={busy}
                            onClick={() =>
                                props.onChoose(
                                    info,
                                    diverged ? "mine" : "remote",
                                )
                            }>
                            {diverged
                                ? "Keep my version (overwrite remote)"
                                : "Use session as saved"}
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={busy}
                            onClick={props.onBack}>
                            Back
                        </Button>
                    </>,
                )}
            </>
        );
    }

    return (
        <Modal
            title={title}
            onCancel={props.onCancel}>
            {body}
            {error && (
                <p
                    role="alert"
                    className="mt-3 text-sm text-red-600">
                    {error}
                </p>
            )}
        </Modal>
    );
}

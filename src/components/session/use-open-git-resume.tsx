import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import type { ISessionInfo } from "@storage/git-resume-storage";
import {
    continueSession,
    discardSession,
    finishContinue,
    openGitResume,
    squashSession,
} from "@store/open-git-resume";
import SessionDialog, { type TSessionView } from "./session-dialog";

interface IPrompt {
    connectionId: string;
    path: string;
    sessions: ISessionInfo[];
    openedAt: number;
    view: TSessionView;
    busy: boolean;
    error: string;
}

/**
 * Opens a repo file in the editor. If it has unsquashed sessions, `dialog`
 * asks what to do first. Shared by the connect page and the library.
 */
export function useOpenGitResume(): {
    open: (connectionId: string, path: string) => Promise<void>;
    dialog: ReactNode;
} {
    const navigate = useNavigate();
    const [prompt, setPrompt] = useState<IPrompt | null>(null);

    async function open(connectionId: string, path: string) {
        const result = await openGitResume(connectionId, path);
        if (result.kind === "opened") return navigate("/editor");
        setPrompt({
            connectionId,
            path,
            sessions: result.sessions,
            openedAt: Date.now(),
            view: { kind: "list" },
            busy: false,
            error: "",
        });
    }

    if (!prompt) return { open, dialog: null };

    const patch = (next: Partial<IPrompt>) =>
        setPrompt((p) => p && { ...p, ...next });
    const { connectionId, path } = prompt;
    // Runs a step; success opens the editor, failure stays in the dialog.
    async function step(run: () => Promise<boolean | void>) {
        patch({ busy: true, error: "" });
        try {
            const done = await run();
            if (done === false) return patch({ busy: false });
            setPrompt(null);
            navigate("/editor");
        } catch (reason) {
            patch({
                busy: false,
                error:
                    reason instanceof Error
                        ? reason.message
                        : "Something went wrong.",
            });
        }
    }

    return {
        open,
        dialog: (
            <SessionDialog
                path={path}
                sessions={prompt.sessions}
                view={prompt.view}
                busy={prompt.busy}
                error={prompt.error}
                now={prompt.openedAt}
                onCancel={() => setPrompt(null)}
                onBack={() => patch({ view: { kind: "list" }, error: "" })}
                onAskConfirm={(action, info) =>
                    patch({ view: { kind: "confirm", action, info } })
                }
                onContinue={(info) =>
                    void step(async () => {
                        const next = await continueSession(
                            connectionId,
                            path,
                            info,
                        );
                        if (next.kind === "opened") return;
                        patch({
                            view: {
                                kind:
                                    next.kind === "ask-local"
                                        ? "local"
                                        : "diverged",
                                info,
                            },
                        });
                        return false;
                    })
                }
                onChoose={(info, choice) =>
                    void step(() =>
                        finishContinue(connectionId, path, info, choice),
                    )
                }
                onSquash={(info) =>
                    void step(async () => {
                        await squashSession(connectionId, path, info);
                    })
                }
                onDiscard={(info) =>
                    void step(() => discardSession(connectionId, path, info))
                }
            />
        ),
    };
}

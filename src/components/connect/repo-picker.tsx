import { useEffect, useState } from "react";
import Button from "@components/ui/button";
import { connections, type IConnection } from "../../git/connections";
import {
    connectionFromHandoff,
    generateFromTemplate,
    listRepos,
    type Handoff,
    type RepoSummary,
} from "../../git/oauth";
import { parseRepoUrl } from "../../git/remote-config";
import { testConnection } from "../../git/test-connection";
import { TEMPLATE_REPO_URL } from "../../git/template";

const input =
    "mt-1 w-full rounded border border-border-light bg-light-100 px-2 py-1.5 font-normal outline-none focus:border-accent dark:border-border-dark dark:bg-dark-200";

interface RepoPickerProps {
    handoff: Handoff;
    onConnected: (connection: IConnection) => void;
}

function templatePath(): string | undefined {
    try {
        return TEMPLATE_REPO_URL
            ? parseRepoUrl(TEMPLATE_REPO_URL).path
            : undefined;
    } catch {
        return undefined;
    }
}

/** After sign-in: choose a repo (or paste a URL), then test and save. */
export default function RepoPicker({ handoff, onConnected }: RepoPickerProps) {
    const [name, setName] = useState(handoff.user.name);
    const [email, setEmail] = useState(handoff.user.email ?? "");
    const [query, setQuery] = useState("");
    const [repos, setRepos] = useState<RepoSummary[]>();
    const [url, setUrl] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const template = handoff.provider === "github" ? templatePath() : undefined;

    useEffect(() => {
        let active = true;
        const timer = setTimeout(() => {
            listRepos(handoff, query).then(
                (list) => active && (setRepos(list), setError("")),
                (reason: unknown) =>
                    active &&
                    setError(
                        reason instanceof Error
                            ? reason.message
                            : "Could not list repositories.",
                    ),
            );
        }, 200);
        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [handoff, query]);

    const ready = Boolean(name.trim() && email.trim()) && !busy;

    async function connect(repoUrl: string) {
        setError("");
        setBusy(true);
        try {
            const parsed = parseRepoUrl(repoUrl);
            const draft = connectionFromHandoff(handoff, parsed, {
                name: name.trim(),
                email: email.trim(),
            });
            const result = await testConnection(draft);
            if (!result.ok) throw new Error(result.error);
            onConnected(await connections.add(draft));
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : String(reason));
            setBusy(false);
        }
    }

    async function createFromTemplate() {
        if (!template) return;
        setBusy(true);
        try {
            const made = await generateFromTemplate(
                handoff.accessToken,
                template,
                "my-resumes",
            );
            await connect(made.cloneUrl);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : String(reason));
            setBusy(false);
        }
    }

    return (
        <div className="space-y-3">
            <p
                role="status"
                className="text-sm text-green-700 dark:text-green-400">
                Signed in as {handoff.user.login || handoff.user.name} on{" "}
                {handoff.host}. Pick a repository.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium">
                    Author name
                    <input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        className={input}
                    />
                </label>
                <label className="block text-sm font-medium">
                    Author email
                    <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className={input}
                    />
                </label>
            </div>
            <label className="block text-sm font-medium">
                Search repositories
                <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className={input}
                />
            </label>
            <ul
                aria-label="Repositories"
                className="max-h-64 space-y-1 overflow-y-auto">
                {repos?.map((repo) => (
                    <li
                        key={repo.fullName}
                        className="flex items-center justify-between gap-2 text-sm">
                        <span>
                            {repo.fullName}
                            {repo.private && (
                                <span className="ml-2 text-xs text-light-700 dark:text-dark-700">
                                    private
                                </span>
                            )}
                        </span>
                        <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={!ready}
                            aria-label={`Use ${repo.fullName}`}
                            onClick={() => void connect(repo.cloneUrl)}>
                            Use
                        </Button>
                    </li>
                ))}
                {repos?.length === 0 && (
                    <li className="text-sm text-light-700 dark:text-dark-700">
                        No repositories found.
                    </li>
                )}
            </ul>
            <div className="flex gap-2">
                <input
                    aria-label="Or paste a repository URL"
                    placeholder="Or paste a repository URL"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    className={input}
                />
                <Button
                    type="button"
                    size="sm"
                    disabled={!ready || !url.trim()}
                    onClick={() => void connect(url)}>
                    Connect URL
                </Button>
            </div>
            {template && (
                <Button
                    type="button"
                    variant="secondary"
                    disabled={!ready}
                    onClick={() => void createFromTemplate()}>
                    Create my repo from the CommitCV template
                </Button>
            )}
            {busy && <p className="text-sm">Working…</p>}
            {error && (
                <p
                    role="alert"
                    className="text-sm text-red-600">
                    {error}
                </p>
            )}
        </div>
    );
}

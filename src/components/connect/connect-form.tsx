import { useState, type FormEvent } from "react";
import Button from "@components/ui/button";
import { trackGit } from "../../analytics";
import { connections, type IConnection } from "../../git/connections";
import {
    detectProvider,
    parseRepoUrl,
    type GitProvider,
} from "../../git/remote-config";
import { TOKEN_HELP } from "../../git/token-help";
import { testConnection } from "../../git/test-connection";
import { whereOf } from "../../git/track";

const input =
    "mt-1 w-full rounded border border-border-light bg-light-100 px-2 py-1.5 font-normal outline-none focus:border-accent dark:border-border-dark dark:bg-dark-200";

interface ConnectFormProps {
    onConnected: (connection: IConnection) => void;
}

export default function ConnectForm({ onConnected }: ConnectFormProps) {
    const [url, setUrl] = useState("");
    const [token, setToken] = useState("");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [label, setLabel] = useState("");
    const [status, setStatus] = useState<{ ok: boolean; text: string }>();
    const [busy, setBusy] = useState(false);

    let provider: GitProvider = "generic";
    let urlError = "";
    try {
        provider = detectProvider(parseRepoUrl(url).host);
    } catch (reason) {
        if (url.trim() && reason instanceof Error) urlError = reason.message;
    }

    const missing = !url.trim() || !token || !name.trim() || !email.trim();

    function draft() {
        const parsed = parseRepoUrl(url);
        return {
            url: parsed.url,
            provider,
            label: label.trim() || parsed.path,
            token,
            author: { name: name.trim(), email: email.trim() },
        };
    }

    async function run(save: boolean) {
        setStatus(undefined);
        let next;
        try {
            next = draft();
        } catch (reason) {
            setStatus({
                ok: false,
                text: reason instanceof Error ? reason.message : String(reason),
            });
            return;
        }
        setBusy(true);
        if (save) {
            trackGit("git connect started", {
                ...whereOf(next),
                method: "token",
            });
        }
        const result = await testConnection(next);
        if (!result.ok) {
            if (save) {
                trackGit("git connect failed", {
                    ...whereOf(next),
                    method: "token",
                    error_class: result.errorClass,
                });
            }
            setBusy(false);
            setStatus({ ok: false, text: result.error });
            return;
        }
        if (!save) {
            setBusy(false);
            setStatus({ ok: true, text: "Connection works." });
            return;
        }
        const saved = await connections.add(next);
        trackGit("git connected", { ...whereOf(next), method: "token" });
        setBusy(false);
        setToken("");
        setStatus({ ok: true, text: "Repository connected." });
        onConnected(saved);
    }

    return (
        <form
            aria-label="Connect a repository"
            className="space-y-3"
            onSubmit={(event: FormEvent) => {
                event.preventDefault();
                if (!missing) void run(true);
            }}>
            <label className="block text-sm font-medium">
                Repository URL
                <input
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="https://github.com/you/resumes"
                    className={input}
                />
            </label>
            {urlError && <p className="text-sm text-red-600">{urlError}</p>}
            <label className="block text-sm font-medium">
                Access token
                <input
                    type="password"
                    autoComplete="off"
                    value={token}
                    onChange={(event) => setToken(event.target.value)}
                    className={input}
                />
            </label>
            <p className="text-xs text-light-700 dark:text-dark-700">
                {TOKEN_HELP[provider]} The token is stored only in this browser
                and is sent only to your git host.
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
                Label (optional)
                <input
                    value={label}
                    onChange={(event) => setLabel(event.target.value)}
                    className={input}
                />
            </label>
            <div className="flex flex-wrap gap-2">
                <Button
                    type="button"
                    variant="secondary"
                    disabled={missing || busy}
                    onClick={() => void run(false)}>
                    {busy ? "Working…" : "Test connection"}
                </Button>
                <Button
                    type="submit"
                    disabled={missing || busy}>
                    Connect
                </Button>
            </div>
            {status && (
                <p
                    role={status.ok ? "status" : "alert"}
                    className={`text-sm ${status.ok ? "text-green-700 dark:text-green-400" : "text-red-600"}`}>
                    {status.text}
                </p>
            )}
        </form>
    );
}

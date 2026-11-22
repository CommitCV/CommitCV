import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faBitbucket,
    faCodeberg,
    faGithub,
    faGitlab,
} from "@fortawesome/free-brands-svg-icons";
import Button from "@components/ui/button";
import type { IConnection } from "../../git/connections";
import {
    fetchProviders,
    loginUrl,
    PROVIDER_NAMES,
    signinErrorMessage,
    takeHandoff,
    type Handoff,
    type ProviderOption,
} from "../../git/oauth";
import RepoPicker from "./repo-picker";

const ICONS = {
    github: faGithub,
    gitlab: faGitlab,
    bitbucket: faBitbucket,
} as const;

const select =
    "rounded border border-border-light bg-light-100 px-2 py-1.5 text-sm dark:border-border-dark dark:bg-dark-200";

function ProviderButton({
    option,
    returnTo,
}: {
    option: ProviderOption;
    returnTo?: string;
}) {
    const [host, setHost] = useState(option.hosts[0]);
    const codeberg = host === "codeberg.org";
    const name = codeberg
        ? "Codeberg"
        : (PROVIDER_NAMES[option.provider] ?? option.provider);
    const icon = codeberg
        ? faCodeberg
        : ICONS[option.provider as keyof typeof ICONS];
    return (
        <div className="flex flex-wrap items-center gap-2">
            <Button
                type="button"
                variant="secondary"
                onClick={() =>
                    window.location.assign(
                        loginUrl(option.provider, host, returnTo),
                    )
                }>
                {icon && (
                    <FontAwesomeIcon
                        icon={icon}
                        className="mr-2"
                    />
                )}
                Sign in with {name}
            </Button>
            {option.hosts.length > 1 ? (
                <select
                    aria-label={`${name} instance`}
                    value={host}
                    onChange={(event) => setHost(event.target.value)}
                    className={select}>
                    {option.hosts.map((h) => (
                        <option key={h}>{h}</option>
                    ))}
                </select>
            ) : (
                !/^(github|gitlab)\.com$|^(bitbucket|codeberg)\.org$/.test(
                    host,
                ) && (
                    <span className="text-sm text-light-700 dark:text-dark-700">
                        {host}
                    </span>
                )
            )}
        </div>
    );
}

const initialParams = () => new URLSearchParams(window.location.search);

/**
 * "Sign in with <provider>" buttons for the providers the server offers,
 * and the return trip: the one-time handoff, then the repo picker. The
 * token only lives in this component's state until a repo is connected.
 */
export default function ProviderSignin({
    onConnected,
    returnTo,
    standalone = false,
}: {
    onConnected: (connection: IConnection) => void;
    /** Page the provider returns to; defaults to `/connect`. */
    returnTo?: string;
    /** The sign-in page itself: always shown, without the paste-a-URL hint. */
    standalone?: boolean;
}) {
    const [providers, setProviders] = useState<ProviderOption[]>([]);
    const [loaded, setLoaded] = useState(false);
    const [params] = useState(initialParams);
    const [handoff, setHandoff] = useState<Handoff>();
    const [error, setError] = useState(() => {
        const code = params.get("signin_error");
        return code ? signinErrorMessage(code) : "";
    });

    useEffect(() => {
        let active = true;
        void fetchProviders().then((list) => {
            if (!active) return;
            setProviders(list);
            setLoaded(true);
        });
        if (params.get("signed_in")) {
            takeHandoff().then(
                (h) => active && setHandoff(h),
                (reason: unknown) =>
                    active &&
                    setError(
                        reason instanceof Error
                            ? reason.message
                            : "Sign-in failed.",
                    ),
            );
        }
        if (params.has("signed_in") || params.has("signin_error")) {
            window.history.replaceState(null, "", window.location.pathname);
        }
        return () => {
            active = false;
        };
    }, [params]);

    if (!standalone && !providers.length && !handoff && !error) return null;
    return (
        <section
            aria-label="Sign in with a git host"
            className="space-y-3 rounded-lg border border-border-light p-4 dark:border-border-dark">
            <h2 className="text-lg font-semibold">
                Sign in with your git host
            </h2>
            {error && (
                <p
                    role="alert"
                    className="text-sm text-red-600">
                    {error}
                </p>
            )}
            {handoff ? (
                <RepoPicker
                    handoff={handoff}
                    onConnected={(connection) => {
                        setHandoff(undefined);
                        onConnected(connection);
                    }}
                />
            ) : (
                <>
                    {providers.map((option) => (
                        <ProviderButton
                            key={option.provider}
                            option={option}
                            returnTo={returnTo}
                        />
                    ))}
                    {standalone && loaded && !providers.length && (
                        <p className="text-sm text-light-700 dark:text-dark-700">
                            No git hosts are set up on this server.
                        </p>
                    )}
                    <p className="text-xs text-light-700 dark:text-dark-700">
                        {standalone
                            ? "The sign-in token is handed to this browser once and never stored on the server."
                            : "Or paste a repository URL and access token below. The sign-in token is handed to this browser once and never stored on the server."}
                    </p>
                </>
            )}
        </section>
    );
}

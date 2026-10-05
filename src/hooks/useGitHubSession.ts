import { useCallback, useEffect, useState } from "react";

interface ISessionResponse {
    authenticated: boolean;
    login?: string;
}

/** The signed-in GitHub login (null when signed out or no server). */
export function useGitHubSession() {
    const [login, setLogin] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        fetch("/api/auth/session")
            .then((response) => response.json() as Promise<ISessionResponse>)
            .then((session) => {
                if (active) {
                    setLogin(
                        session.authenticated ? (session.login ?? "") : null,
                    );
                }
            })
            .catch(() => {});
        return () => {
            active = false;
        };
    }, []);

    const signOut = useCallback(async () => {
        try {
            const response = await fetch("/api/auth/logout", {
                method: "POST",
            });
            if (response.ok) setLogin(null);
        } catch {
            // Still signed in; the button stays available to retry.
        }
    }, []);

    return { login, signOut };
}

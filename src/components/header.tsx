import { NavLink } from "react-router";
import Logo from "@components/ui/logo";
import ThemeSwitcher from "@components/theme-switcher";
import { useGitHubSession } from "@hooks/useGitHubSession";

const authButtonClass =
    "inline-flex items-center justify-center rounded-md bg-light-200 px-5 py-2 text-base font-semibold text-light-950 hover:opacity-90 dark:bg-dark-100 dark:text-dark-950";

export default function Header() {
    const { login, signOut } = useGitHubSession();

    return (
        <header className="sticky top-0 z-50 backdrop-blur-sm bg-light-50 dark:bg-dark-50 border-b-4 border-border-light dark:border-border-dark">
            <div className="flex items-center justify-between px-8 py-4 max-w-screen-xl mx-auto">
                <NavLink
                    to="/"
                    aria-label="CommitCV Home">
                    <Logo size="lg" />
                </NavLink>

                <div className="flex items-center gap-4">
                    <a
                        href="/"
                        className="hidden rounded-md border border-border-light px-3 py-1.5 text-sm font-semibold text-light-950 hover:bg-light-200 dark:border-border-dark dark:text-dark-950 dark:hover:bg-dark-100 sm:inline-flex">
                        Resume Library
                    </a>
                    {login === null ? (
                        <a
                            href="/api/auth/login"
                            className={authButtonClass}>
                            Sign In
                        </a>
                    ) : (
                        <button
                            type="button"
                            title={login ? `Signed in as ${login}` : undefined}
                            onClick={() => void signOut()}
                            className={authButtonClass}>
                            Sign out
                        </button>
                    )}
                    <ThemeSwitcher />
                </div>
            </div>
        </header>
    );
}

import { NavLink } from "react-router";
import { buttonClass } from "@components/ui/button-class";
import Logo from "@components/ui/logo";
import ThemeSwitcher from "@components/theme-switcher";
import { useGitHubSession } from "@hooks/useGitHubSession";

const authButtonClass = buttonClass("secondary", "sm");

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
                    <NavLink
                        to="/library"
                        className={buttonClass(
                            "ghost",
                            "sm",
                            "hidden font-semibold sm:inline-flex",
                        )}>
                        Resume Library
                    </NavLink>
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

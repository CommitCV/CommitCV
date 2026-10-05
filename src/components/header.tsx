import { NavLink } from "react-router";
import Logo from "@components/ui/logo";
import Button from "@components/ui/button";
import ThemeSwitcher from "@components/theme-switcher";

export default function Header() {
    return (
        <header className="sticky top-0 z-50 backdrop-blur-sm bg-light-50 dark:bg-dark-50 border-b-4 border-border-light dark:border-border-dark">
            <div className="flex items-center justify-between px-8 py-4 max-w-screen-xl mx-auto">
                <NavLink
                    to="/"
                    aria-label="CommitCV Home">
                    <Logo size="lg" />
                </NavLink>

                <div className="flex items-center gap-4">
                    <Button
                        variant="secondary"
                        size="md">
                        Sign In
                    </Button>
                    <ThemeSwitcher />
                </div>
            </div>
        </header>
    );
}

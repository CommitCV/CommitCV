import { useState } from "react";
import { NavLink } from "react-router";
import { buttonClass } from "@components/ui/button-class";
import { Bars, Git, Xmark } from "@components/ui/icons";
import Logo from "@components/ui/logo";
import ThemeSwitcher from "@components/theme-switcher";

const authButtonClass = buttonClass("secondary", "sm");

export default function Header() {
    const [menuOpen, setMenuOpen] = useState(false);
    const closeMenu = () => setMenuOpen(false);

    return (
        <header className="sticky top-0 z-50 backdrop-blur-sm bg-light-50 dark:bg-dark-50 border-b-4 border-border-light dark:border-border-dark">
            <div className="flex items-center justify-between px-4 sm:px-8 py-4 max-w-screen-xl mx-auto">
                <NavLink
                    to="/"
                    aria-label="CommitCV Home"
                    onClick={closeMenu}>
                    <Logo size="lg" />
                </NavLink>

                <div className="hidden sm:flex items-center gap-4">
                    <NavLink
                        to="/library"
                        className={buttonClass("secondary", "sm")}>
                        Resume Library
                    </NavLink>
                    <NavLink
                        to="/signin"
                        className={`${authButtonClass} gap-1.5`}>
                        <Git className="h-4 w-4" />
                        Sign in with Git
                    </NavLink>
                    <ThemeSwitcher />
                </div>

                <div className="flex items-center gap-2 sm:hidden">
                    <ThemeSwitcher />
                    <button
                        type="button"
                        onClick={() => setMenuOpen((open) => !open)}
                        aria-expanded={menuOpen}
                        aria-controls="mobile-menu"
                        aria-label={menuOpen ? "Close menu" : "Open menu"}
                        className={buttonClass(
                            "ghost",
                            "icon",
                            "rounded-full text-light-700 dark:text-dark-700",
                        )}>
                        {menuOpen ? (
                            <Xmark className="h-5 w-5" />
                        ) : (
                            <Bars className="h-5 w-5" />
                        )}
                    </button>
                </div>
            </div>

            {menuOpen && (
                <nav
                    id="mobile-menu"
                    aria-label="Main"
                    className="flex flex-col gap-3 border-t-4 border-border-light bg-light-50 px-4 py-4 sm:hidden dark:border-border-dark dark:bg-dark-50">
                    <NavLink
                        to="/library"
                        onClick={closeMenu}
                        className={buttonClass(
                            "secondary",
                            "md",
                            "justify-center",
                        )}>
                        Resume Library
                    </NavLink>
                    <NavLink
                        to="/signin"
                        onClick={closeMenu}
                        className={buttonClass(
                            "secondary",
                            "md",
                            "justify-center gap-2",
                        )}>
                        <Git className="h-4 w-4" />
                        Sign in with Git
                    </NavLink>
                </nav>
            )}
        </header>
    );
}

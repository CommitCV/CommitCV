import { NavLink } from "react-router";
import Logo from "@components/ui/logo";

const linkClass =
    "text-sm font-medium text-light-700 hover:underline dark:text-dark-700";

export default function Footer() {
    return (
        <footer className="backdrop-blur-sm bg-light-50 dark:bg-dark-50 border-t-4 border-border-light dark:border-border-dark">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-8 py-12 max-w-screen-xl mx-auto">
                <span className="text-lg font-light text-light-950/50 dark:text-dark-950/50">
                    © {new Date().getFullYear()}
                </span>
                <Logo size="sm" />
                <nav className="ml-auto flex items-center gap-6">
                    <NavLink
                        to="/privacy"
                        className={linkClass}>
                        Privacy Policy
                    </NavLink>
                    <NavLink
                        to="/terms"
                        className={linkClass}>
                        Terms of Use
                    </NavLink>
                </nav>
            </div>
        </footer>
    );
}

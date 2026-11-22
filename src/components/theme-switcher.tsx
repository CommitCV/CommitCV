import { faMoon, faSun } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { buttonClass } from "@components/ui/button-class";
import { useTheme } from "@hooks/useTheme";

export default function ThemeSwitcher() {
    const { theme, changeTheme } = useTheme();

    const toggle = () => {
        changeTheme(theme === "dark" ? "light" : "dark");
    };

    return (
        <button
            type="button"
            onClick={toggle}
            className={buttonClass(
                "ghost",
                "icon",
                "rounded-full text-light-700 dark:text-dark-700",
            )}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
            <FontAwesomeIcon
                icon={theme === "dark" ? faSun : faMoon}
                className="h-5 w-5"
            />
        </button>
    );
}

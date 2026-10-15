import { faMoon, faSun } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
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
            className="p-2 rounded-full text-light-700 dark:text-dark-700 hover:bg-light-200 dark:hover:bg-dark-100 transition-colors"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
            <FontAwesomeIcon
                icon={theme === "dark" ? faSun : faMoon}
                className="h-[22px] w-[22px]"
            />
        </button>
    );
}

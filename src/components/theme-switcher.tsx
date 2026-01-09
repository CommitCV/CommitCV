import { useTheme } from "@hooks/useTheme";

export default function ThemeSwitcher() {
    const { theme, changeTheme } = useTheme();

    const setDarkTheme = () => {
        changeTheme("dark");
    };

    const setLightTheme = () => {
        changeTheme("light");
    };

    const setSepiaTheme = () => {
        changeTheme("sepia");
    };

    return (
        <>
            <p>Current Theme: {theme}</p>

            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={setDarkTheme}
                    className="
                        inline-flex items-center gap-2
                        rounded-full px-4 py-2
                        bg-bg-3
                        text-fg-1
                        text-sm font-medium
                        transition-colors
                        hover:bg-bg-4
                    "
                    aria-label="Set dark theme">
                    Dark
                </button>

                <button
                    type="button"
                    onClick={setLightTheme}
                    className="
                        inline-flex items-center gap-2
                        rounded-full px-4 py-2
                        bg-bg-3
                        text-fg-1
                        text-sm font-medium
                        transition-colors
                        hover:bg-bg-4
                    "
                    aria-label="Set light theme">
                    Light
                </button>

                <button
                    type="button"
                    onClick={setSepiaTheme}
                    className="
                        inline-flex items-center gap-2
                        rounded-full px-4 py-2
                        bg-bg-3
                        text-fg-1
                        text-sm font-medium
                        transition-colors
                        hover:bg-bg-4
                    "
                    aria-label="Set sepia theme">
                    Sepia
                </button>
            </div>
        </>
    );
}

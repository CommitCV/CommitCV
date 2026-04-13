import { useEffect } from "react";
import { useAppStore, type TTheme } from "src/store/useAppStore";

export const useTheme = () => {
    const { theme, setTheme } = useAppStore();

    useEffect(() => {
        const root = window.document.documentElement;

        root.classList.remove("light", "dark");
        root.classList.add(theme);
        setTheme(theme);
    }, [theme]);

    const changeTheme = (newTheme: TTheme) => {
        setTheme(newTheme);
    };

    return { theme, changeTheme };
};

import { useState, useEffect } from "react";

export const useTheme = () => {
    const [theme, setTheme] = useState(
        () => localStorage.getItem("theme") || "light",
    );

    useEffect(() => {
        const root = window.document.documentElement;

        root.classList.remove("light", "dark", "sepia");
        root.classList.add(theme);
        localStorage.setItem("theme", theme);
    }, [theme]);

    const changeTheme = (newTheme: string) => {
        setTheme(newTheme);
    };

    return { theme, changeTheme };
};

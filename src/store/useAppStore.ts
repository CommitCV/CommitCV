import { create } from "zustand";

export type TTheme = "light" | "dark";

interface IAppStore {
    theme: TTheme;
    setTheme: (theme: TTheme) => void;
}

export const useAppStore = create<IAppStore>((set) => ({
    theme: "light",
    setTheme: (theme) => set({ theme }),
}));

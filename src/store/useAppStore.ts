import type { IResume } from "src/data/IResume";
import { create } from "zustand";

export type TTheme = "light" | "dark";

interface IAppStore {
    theme: TTheme;
    setTheme: (theme: TTheme) => void;
    cachedResume: IResume | null;
    setCachedResume: (resume: IResume) => void;
}

export const useAppStore = create<IAppStore>((set) => ({
    theme: "light",
    setTheme: (theme) => set({ theme }),
    cachedResume: null,
    setCachedResume: (cachedResume) => set({ cachedResume }),
}));

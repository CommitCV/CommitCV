import type { IResume } from "src/data/IResume";
import { create } from "zustand";

interface IResumeStore {
    resume: IResume | null;
    setResume: (resume: IResume) => void;
}

export const useResumeStore = create<IResumeStore>((set) => ({
    resume: null,
    setResume: (resume) => set({ resume }),
}));

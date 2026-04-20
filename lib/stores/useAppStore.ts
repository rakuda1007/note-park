import { create } from "zustand";

type AppState = {
  hydrated: boolean;
  setHydrated: (value: boolean) => void;
};

/**
 * アプリ全体で共有する最小サンプル。必要に応じてフィールドを増やしてください。
 */
export const useAppStore = create<AppState>((set) => ({
  hydrated: false,
  setHydrated: (value) => set({ hydrated: value }),
}));

import { create } from "zustand";

type NavigationState = {
  current: number;
  setCurrent: (index: number) => void;
};

export const useNavigationStore = create<NavigationState>((set) => ({
  current: 1,
  setCurrent: (current) => set({ current }),
}));

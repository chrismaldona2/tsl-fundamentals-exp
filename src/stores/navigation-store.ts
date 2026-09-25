import { create } from "zustand";
import { persist } from "zustand/middleware";

type NavigationState = {
  activeZoneId: string | null;
  targetPosition: [number, number, number];
  navigate: (position: [number, number, number], id: string) => void;
};

export const useNavigationStore = create<NavigationState>()(
  persist(
    (set) => ({
      activeZoneId: null,
      targetPosition: [0, 0, 0],
      navigate: (targetPosition, activeZoneId) =>
        set({ targetPosition, activeZoneId }),
    }),
    {
      name: "navigation-storage",
      partialize: (state) => ({
        targetPosition: state.targetPosition,
        activeZoneId: state.activeZoneId,
      }),
    },
  ),
);

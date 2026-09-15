import { create } from "zustand";
import type { TransformControlsMode } from "three/examples/jsm/Addons.js";

type GizmoState = {
  mode: TransformControlsMode;
  setMode: (mode: TransformControlsMode) => void;
};

export const useGizmoStore = create<GizmoState>((set) => ({
  mode: "translate",
  setMode: (mode) => set({ mode }),
}));

import { useEffect } from "react";
import { useGizmoStore } from "../stores/gizmo-store";

export default function GizmoManager() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "t")
        useGizmoStore.getState().setMode("translate");

      if (e.key.toLowerCase() === "r")
        useGizmoStore.getState().setMode("rotate");

      if (e.key.toLowerCase() === "s")
        useGizmoStore.getState().setMode("scale");
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return null;
}

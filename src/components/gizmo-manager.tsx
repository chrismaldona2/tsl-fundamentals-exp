import { useEffect } from "react";
import { useGizmoStore } from "../stores/gizmo-store";

export default function GizmoManager() {
  useEffect(() => {
    const setGizmoMode = useGizmoStore.getState().setMode;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "t") setGizmoMode("translate");
      if (e.key.toLowerCase() === "r") setGizmoMode("rotate");
      if (e.key.toLowerCase() === "s") setGizmoMode("scale");
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return null;
}

import { Suspense } from "react";
import Lights from "./lights";
import GizmoManager from "./gizmo-manager";
import MagicExplotionsLesson from "../tests/14-magic-explotions";

export default function Scene() {
  return (
    <>
      <Lights />
      <GizmoManager />
      <Suspense fallback={null}>
        <MagicExplotionsLesson />
      </Suspense>
    </>
  );
}

import { Suspense } from "react";
import Lights from "./lights";
import GizmoManager from "./gizmo-manager";
import ShieldLesson from "../tests/12-shield";

export default function Scene() {
  return (
    <>
      <Lights />
      <GizmoManager />
      <Suspense fallback={null}>
        <ShieldLesson />
      </Suspense>
    </>
  );
}

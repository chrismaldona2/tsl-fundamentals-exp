import { Suspense } from "react";
import Lights from "./lights";
import GizmoManager from "./gizmo-manager";
import Galaxy from "../lessons/16-galaxy";

export default function Scene() {
  return (
    <>
      <Lights />
      <GizmoManager />
      <Suspense fallback={null}>
        <Galaxy />
      </Suspense>
    </>
  );
}

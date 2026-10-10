import { Suspense } from "react";
import Lights from "./lights";
import GizmoManager from "./gizmo-manager";
import AnvilLesson from "../lessons/17-anvil";

export default function Scene() {
  return (
    <>
      <Lights />
      <GizmoManager />
      <Suspense fallback={null}>
        <AnvilLesson />
      </Suspense>
    </>
  );
}

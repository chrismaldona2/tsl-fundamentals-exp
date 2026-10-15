import { Suspense } from "react";
import Lights from "./lights";
import GizmoManager from "./gizmo-manager";
import StylizedNatureSceneLesson from "../lessons/20-stylized-nature-scene";

export default function Scene() {
  return (
    <>
      <Lights />
      <GizmoManager />
      <Suspense fallback={null}>
        <StylizedNatureSceneLesson />
      </Suspense>
    </>
  );
}

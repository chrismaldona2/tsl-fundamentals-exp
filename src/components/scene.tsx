import { Suspense } from "react";
import Lights from "./lights";
import GizmoManager from "./gizmo-manager";
import SpheresParticlesPhysicsLesson from "../lessons/19-spheres-particles-physics";

export default function Scene() {
  return (
    <>
      <Lights />
      <GizmoManager />
      <Suspense fallback={null}>
        <SpheresParticlesPhysicsLesson />
      </Suspense>
    </>
  );
}

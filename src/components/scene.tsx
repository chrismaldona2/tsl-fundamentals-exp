import { Suspense } from "react";
import Lights from "./lights";
import GizmoManager from "./gizmo-manager";
import InstancesLesson from "../tests/13-instances";

export default function Scene() {
  return (
    <>
      <Lights />
      <GizmoManager />
      <Suspense fallback={null}>
        <InstancesLesson />
      </Suspense>
    </>
  );
}

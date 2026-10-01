import Lights from "./lights";
import GizmoManager from "./gizmo-manager";
import { Suspense } from "react";
import PostProcessingLesson from "../tests/11-postprocessing";

export default function Scene() {
  return (
    <>
      <Lights />
      <GizmoManager />
      <Suspense fallback={null}>
        <PostProcessingLesson />
      </Suspense>
    </>
  );
}

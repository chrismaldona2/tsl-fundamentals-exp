import { Suspense } from "react";
import Lights from "./lights";
import GizmoManager from "./gizmo-manager";
import ClairObscurTitleLesson from "../lessons/18-clair-obscur-title";

export default function Scene() {
  return (
    <>
      <Lights />
      <GizmoManager />
      <Suspense fallback={null}>
        <ClairObscurTitleLesson />
      </Suspense>
    </>
  );
}

import { useEffect, useRef, useMemo, type RefObject } from "react";
import { useThree } from "@react-three/fiber/webgpu";
import {
  OrbitControls,
  TransformControls as TransformControlsImpl,
  type TransformControlsMode,
} from "three/examples/jsm/Addons.js";
import type { Object3D } from "three/webgpu";
import { useGizmoStore } from "../stores/gizmo-store";

type TransformControlsProps = {
  object?: RefObject<Object3D | null> | Object3D | null;
  size?: number;
  defaultMode?: TransformControlsMode;
  disabledModes?: TransformControlsMode[];
};

export default function TransformControls({
  object,
  size = 0.6,
  defaultMode = "translate",
  disabledModes = [],
}: TransformControlsProps) {
  const controlsRef = useRef<TransformControlsImpl | null>(null);
  const camera = useThree((s) => s.camera);
  const renderer = useThree((s) => s.renderer);
  const scene = useThree((s) => s.scene);
  const controls = useThree((s) => s.controls);
  const globalMode = useGizmoStore((s) => s.mode);

  // Active mode resolver
  const activeMode = useMemo(() => {
    if (!disabledModes.includes(globalMode)) return globalMode;
    if (!disabledModes.includes(defaultMode)) return defaultMode;
    const allModes: TransformControlsMode[] = ["translate", "rotate", "scale"];
    const safeMode = allModes.find((m) => !disabledModes.includes(m));
    return safeMode || "translate";
  }, [globalMode, defaultMode, disabledModes]);

  useEffect(() => {
    if (controlsRef.current) controlsRef.current.setMode(activeMode);
  }, [activeMode]);

  // Instantiation / Unmount cleanup
  useEffect(() => {
    if (!object) return;
    const targetObject = "isObject3D" in object ? object : object.current;
    if (!targetObject) return;

    const transformControls = new TransformControlsImpl(
      camera,
      renderer.domElement,
    );

    transformControls.setSize(size);
    transformControls.attach(targetObject);
    controlsRef.current = transformControls;

    const helper = transformControls.getHelper();
    scene.add(helper);

    const onDraggingChanged = (e: { value: unknown }) => {
      if (controls instanceof OrbitControls) {
        controls.enabled = !(e.value as boolean);
      }
    };
    transformControls.addEventListener("dragging-changed", onDraggingChanged);

    return () => {
      transformControls.detach();
      scene.remove(helper);
      transformControls.removeEventListener(
        "dragging-changed",
        onDraggingChanged,
      );
      transformControls.dispose();
      controlsRef.current = null;
    };
  }, [camera, renderer.domElement, scene, controls, size, object]);

  return null;
}

import { useLayoutEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber/webgpu";
import { Vector3 } from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { useNavigationStore } from "../stores/navigation-store";

export default function CameraRig() {
  const targetPosition = useNavigationStore((s) => s.targetPosition);
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls);

  const temps = useRef({
    targetVec: new Vector3(),
    cameraOffset: new Vector3(7, 8, 4),
    desiredCameraPos: new Vector3(),
  });

  useLayoutEffect(() => {
    if (!(controls instanceof OrbitControls)) return;
    const { targetVec, cameraOffset, desiredCameraPos } = temps.current;

    targetVec.set(...targetPosition);
    desiredCameraPos.copy(targetVec).add(cameraOffset);
    camera.position.copy(desiredCameraPos);
    controls.target.copy(targetVec);
    controls.update();
  }, [controls]);

  useFrame((_, delta) => {
    if (!(controls instanceof OrbitControls)) return;
    const { targetVec, cameraOffset, desiredCameraPos } = temps.current;
    targetVec.set(...targetPosition);

    const distanceToTarget = controls.target.distanceTo(targetVec);
    if (distanceToTarget > 0.01) {
      desiredCameraPos.copy(targetVec).add(cameraOffset);
      const alpha = 1 - Math.exp(-4 * delta);
      camera.position.lerp(desiredCameraPos, alpha);
      controls.target.lerp(targetVec, alpha);
    }

    controls.update();
  });

  return null;
}

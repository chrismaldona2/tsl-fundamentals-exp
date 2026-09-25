import { useFrame } from "@react-three/fiber/webgpu";
import { Vector3 } from "three";
import type { DirectionalLight } from "three/webgpu";
import { useNavigationStore } from "../stores/navigation-store";
import { useRef } from "react";

export default function Lights() {
  const targetPosition = useNavigationStore((s) => s.targetPosition);
  const lightRef = useRef<DirectionalLight>(null);

  const temps = useRef({
    target: new Vector3(),
    desiredPos: new Vector3(),
    currentTarget: new Vector3(),
    offset: new Vector3(8.48, 3.18, -4.24),
  });

  useFrame((_, delta) => {
    if (!lightRef.current) return;
    const { target, desiredPos, currentTarget, offset } = temps.current;

    target.set(...targetPosition);
    desiredPos.copy(target).add(offset);

    const alpha = 1 - Math.exp(-4 * delta);
    lightRef.current.position.lerp(desiredPos, alpha);
    currentTarget.lerp(target, alpha);

    lightRef.current.target.position.copy(currentTarget);
    lightRef.current.target.updateMatrixWorld();
  });

  return (
    <>
      <ambientLight color="#859dff" intensity={1} />
      <directionalLight
        ref={lightRef}
        position={[8.48, 3.18, -4.24]}
        color="#ffffff"
        intensity={4.5}
        castShadow
        shadow-camera-top={10}
        shadow-camera-right={10}
        shadow-camera-bottom={-10}
        shadow-camera-left={-10}
        shadow-camera-near={0.01}
        shadow-camera-far={20}
        shadow-radius={3}
        shadow-normalBias={0.1}
      />
    </>
  );
}

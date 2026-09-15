import { useEffect, useRef } from "react";
import type { DirectionalLight } from "three/webgpu";
import { useNavigationStore } from "../stores/navigation-store";

export default function Lights() {
  const current = useNavigationStore((s) => s.current);

  const lightRef = useRef<DirectionalLight>(null);
  useEffect(() => {
    if (!lightRef.current) return;

    const targetZ = current * -10;
    lightRef.current.position.z = -4.24 + targetZ;
    lightRef.current.target.position.z = targetZ;
    lightRef.current.target.updateMatrixWorld();
  }, [current]);

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

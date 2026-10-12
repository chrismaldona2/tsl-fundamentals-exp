import { useRef } from "react";
import type { AmbientLight, DirectionalLight } from "three/webgpu";

export default function Lights() {
  const ambientLightRef = useRef<AmbientLight>(null);
  const directionalLightRef = useRef<DirectionalLight>(null);

  return (
    <>
      <ambientLight ref={ambientLightRef} color="#859dff" intensity={1} />
      <directionalLight
        ref={directionalLightRef}
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

import { useTexture, type ThreeElements } from "@react-three/fiber/webgpu";
import { useMemo, useRef } from "react";
import { Mesh, SRGBColorSpace } from "three/webgpu";
import { uv, positionLocal, vec4 } from "three/tsl";
import TransformControls from "../components/transform-controls";

export default function VariablesAndReferencesTest(
  props: ThreeElements["group"],
) {
  return (
    <group {...props}>
      <Floor />
      <TorusKnot position-y={1} />
    </group>
  );
}

function Floor(props: ThreeElements["mesh"]) {
  const diffuse = useTexture("/textures/grass.webp", (tex) => {
    tex.colorSpace = SRGBColorSpace;
  });

  const nodes = useMemo(() => {
    const opacityNode = uv().sub(0.5).length().smoothstep(0.5, 0.2);
    return {
      opacityNode,
    };
  }, []);

  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow {...props}>
      <planeGeometry args={[10, 10, 1, 1]} />
      <meshStandardNodeMaterial transparent map={diffuse} {...nodes} />
    </mesh>
  );
}

function TorusKnot(props: ThreeElements["mesh"]) {
  const meshRef = useRef<Mesh>(null);

  const nodes = useMemo(() => {
    const outputNode = vec4(positionLocal, 1);
    return {
      outputNode,
    };
  }, []);

  return (
    <>
      <TransformControls objectRef={meshRef} />
      <mesh ref={meshRef} castShadow receiveShadow {...props}>
        <torusKnotGeometry args={[0.5, 0.24, 128, 32]} />
        <meshStandardNodeMaterial {...nodes} />
      </mesh>
    </>
  );
}

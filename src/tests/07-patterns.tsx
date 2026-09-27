import { useTexture, type ThreeElements } from "@react-three/fiber/webgpu";
import { useMemo } from "react";
import { vec3 } from "three/tsl";
import { RepeatWrapping, SRGBColorSpace } from "three/webgpu";

export default function PatternsTest(props: ThreeElements["group"]) {
  return (
    <group {...props}>
      <Floor />
      <TorusKnot position-y={1} />
    </group>
  );
}

function Floor(props: ThreeElements["mesh"]) {
  const diffuse = useTexture("/textures/seamless-grass.webp", (tex) => {
    tex.colorSpace = SRGBColorSpace;
    tex.wrapS = RepeatWrapping;
    tex.wrapT = RepeatWrapping;
    tex.repeat.set(1, 2);
  });

  const nodes = useMemo(() => {
    return {};
  }, []);

  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow {...props}>
      <planeGeometry args={[10, 20, 1, 1]} />
      <meshStandardNodeMaterial transparent map={diffuse} {...nodes} />
    </mesh>
  );
}

function TorusKnot(props: ThreeElements["mesh"]) {
  const nodes = useMemo(() => {
    const colorNode = vec3(1);
    return {
      colorNode,
    };
  }, []);

  return (
    <mesh castShadow receiveShadow {...props}>
      <torusKnotGeometry args={[0.5, 0.24, 128, 32]} />
      <meshStandardNodeMaterial {...nodes} />
    </mesh>
  );
}

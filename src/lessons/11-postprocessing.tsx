import { useTexture, type ThreeElements } from "@react-three/fiber/webgpu";
import { useLayoutEffect, useMemo } from "react";
import { type Mesh, SRGBColorSpace } from "three/webgpu";
import { mrt, output, uv, vec4 } from "three/tsl";
import { useGLTF } from "@react-three/drei/webgpu";

export default function PostProcessingLesson(props: ThreeElements["group"]) {
  return (
    <group {...props}>
      <Floor />
      <Anvil />
    </group>
  );
}

function Floor(props: ThreeElements["mesh"]) {
  const diffuse = useTexture("/textures/grass.webp", (tex) => {
    tex.colorSpace = SRGBColorSpace;
  });

  const nodes = useMemo(() => {
    const opacityNode = uv().sub(0.5).length().smoothstep(0.5, 0.2);
    const mrtNode = mrt({ output, normal: vec4(0) });

    return {
      opacityNode,
      mrtNode,
    };
  }, []);

  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow {...props}>
      <planeGeometry args={[10, 10, 1, 1]} />
      <meshStandardNodeMaterial transparent map={diffuse} {...nodes} />
    </mesh>
  );
}

function Anvil(props: ThreeElements["group"]) {
  const glb = useGLTF("/models/anvil.glb");

  useLayoutEffect(() => {
    glb.scene.traverse((child) => {
      if ((child as Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [glb]);

  return (
    <group {...props} dispose={null}>
      <primitive object={glb.scene} />
    </group>
  );
}

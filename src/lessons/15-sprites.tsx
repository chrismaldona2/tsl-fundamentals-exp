import { type ThreeElements, useTexture } from "@react-three/fiber/webgpu";
import { useMemo } from "react";
import { SRGBColorSpace } from "three/webgpu";
import {
  uv,
  mrt,
  output,
  vec4,
  range,
  vec3,
  time,
  hash,
  instanceIndex,
  float,
  positionLocal,
} from "three/tsl";

export default function SpritesLesson(props: ThreeElements["group"]) {
  return (
    <group {...props}>
      <Floor />
      <StressTest />
    </group>
  );
}

function Sprites(props: ThreeElements["sprite"]) {
  const { nodes } = useMemo(() => {
    const positionNode = range(vec3(-3, 0, -3), vec3(3, 3, 3));
    const scaleNode = range(0.01, 0.03);
    const colorNode = vec3(uv(), 1);
    const rotationNode = time.mul(hash(instanceIndex).sub(0.5));

    return {
      nodes: { positionNode, scaleNode, colorNode, rotationNode },
    };
  }, []);

  return (
    <sprite count={10} {...props}>
      <spriteNodeMaterial sizeAttenuation={false} {...nodes} />
    </sprite>
  );
}

function SpritesWithMesh(props: ThreeElements["mesh"]) {
  const { nodes } = useMemo(() => {
    const positionNode = range(vec3(-3, 0, -3), vec3(3, 3, 3));
    const scaleNode = range(0.2, 0.5);
    const colorNode = vec3(uv(), 1);
    const rotationNode = time.mul(hash(instanceIndex).sub(0.5));

    return {
      nodes: { positionNode, scaleNode, colorNode, rotationNode },
    };
  }, []);

  return (
    <mesh count={10} {...props}>
      <circleGeometry args={[0.5, 16]} />
      <spriteNodeMaterial {...nodes} />
    </mesh>
  );
}

function StressTest(props: ThreeElements["sprite"]) {
  const { nodes } = useMemo(() => {
    const positionNode = range(vec3(-3, 0, -3), vec3(3, 3, 3));
    const scaleNode = float(0.005);
    const colorNode = positionLocal
      .remap(vec3(-3, 0, -3), vec3(3, 3, 3))
      .toVertexStage();

    return {
      nodes: { positionNode, scaleNode, colorNode },
    };
  }, []);

  return (
    <sprite count={1_000_000} {...props}>
      <spriteNodeMaterial {...nodes} />
    </sprite>
  );
}

function Floor(props: ThreeElements["mesh"]) {
  const diffuseTexture = useTexture("/textures/grass.webp", (tex) => {
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
    <mesh rotation-x={-Math.PI / 2} renderOrder={-1} receiveShadow {...props}>
      <planeGeometry args={[10, 10, 1, 1]} />
      <meshStandardNodeMaterial map={diffuseTexture} transparent {...nodes} />
    </mesh>
  );
}

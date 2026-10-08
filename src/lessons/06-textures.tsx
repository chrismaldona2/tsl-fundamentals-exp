import { useTexture, type ThreeElements } from "@react-three/fiber/webgpu";
import { useMemo, useRef } from "react";
import {
  type Mesh,
  MirroredRepeatWrapping,
  SRGBColorSpace,
} from "three/webgpu";
import {
  uv,
  texture,
  rotateUV,
  vec2,
  float,
  triplanarTexture,
  vibrance,
  grayscale,
  normalWorld,
  positionWorld,
} from "three/tsl";
import TransformControls from "../components/transform-controls";

export default function TexturesLesson(props: ThreeElements["group"]) {
  return (
    <group {...props}>
      <Floor />
      <TorusKnot position-y={1} />
    </group>
  );
}

function Floor(props: ThreeElements["mesh"]) {
  const diffuse = useTexture("/textures/uv-checker.png", (tex) => {
    tex.colorSpace = SRGBColorSpace;
    tex.wrapS = MirroredRepeatWrapping;
    tex.wrapT = MirroredRepeatWrapping;
  });

  const nodes = useMemo(() => {
    const colorNode = vibrance(
      texture(diffuse, rotateUV(uv().mul(3), float(-1.65), vec2(0))),
      0.1,
    );
    const opacityNode = uv().sub(0.5).length().smoothstep(0.5, 0.2);

    return {
      colorNode,
      opacityNode,
    };
  }, [diffuse]);

  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow {...props}>
      <planeGeometry args={[10, 10, 1, 1]} />
      <meshStandardNodeMaterial transparent {...nodes} />
    </mesh>
  );
}

function TorusKnot(props: ThreeElements["mesh"]) {
  const meshRef = useRef<Mesh>(null);

  const diffuse = useTexture("/textures/uv-checker.png", (tex) => {
    tex.colorSpace = SRGBColorSpace;
    tex.wrapS = MirroredRepeatWrapping;
    tex.wrapT = MirroredRepeatWrapping;
  });

  const nodes = useMemo(() => {
    const colorNode = grayscale(
      vibrance(
        triplanarTexture(
          texture(diffuse),
          null,
          null,
          float(1),
          positionWorld,
          normalWorld,
        ),
        1,
      ),
    );

    return {
      colorNode,
    };
  }, [diffuse]);

  return (
    <>
      <TransformControls object={meshRef} />
      <mesh ref={meshRef} castShadow receiveShadow {...props}>
        <torusKnotGeometry args={[0.5, 0.24, 128, 32]} />
        <meshStandardNodeMaterial {...nodes} />
      </mesh>
    </>
  );
}

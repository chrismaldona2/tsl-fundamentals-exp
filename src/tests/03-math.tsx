import { type ThreeElements } from "@react-three/fiber/webgpu";
import { useMemo } from "react";
import {
  uv,
  positionLocal,
  mx_noise_float,
  rand,
  vec3,
  time,
  rotate,
} from "three/tsl";

export default function MathTest(props: ThreeElements["group"]) {
  return (
    <group {...props}>
      <Floor />
      <TorusKnot position-y={1} />
    </group>
  );
}

function Floor(props: ThreeElements["mesh"]) {
  const nodes = useMemo(() => {
    const pattern = rand(uv().mul(100).floor());
    const colorNode = vec3(pattern);
    const opacityNode = uv().sub(0.5).length().smoothstep(0.5, 0.2);

    return {
      colorNode,
      opacityNode,
    };
  }, []);

  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow {...props}>
      <planeGeometry args={[10, 10, 1, 1]} />
      <meshStandardNodeMaterial transparent {...nodes} />
    </mesh>
  );
}

function TorusKnot(props: ThreeElements["mesh"]) {
  const nodes = useMemo(() => {
    const noise = mx_noise_float(positionLocal.mul(4));
    const colorNode = vec3(noise);

    const angle = time.add(positionLocal.y).sin();
    const newXZ = rotate(positionLocal.xz, angle);
    const positionNode = vec3(newXZ.x, positionLocal.y, positionLocal.z);

    return {
      colorNode,
      positionNode,
    };
  }, []);

  return (
    <>
      <mesh castShadow receiveShadow {...props}>
        <torusKnotGeometry args={[0.5, 0.24, 128, 32]} />
        <meshStandardNodeMaterial {...nodes} />
      </mesh>
    </>
  );
}

import type { ThreeElements } from "@react-three/fiber/webgpu";
import { useMemo } from "react";
import {
  uv,
  mx_noise_vec3,
  checker,
  positionLocal,
  time,
  vec2,
  vec3,
} from "three/tsl";

export default function NodeMaterialsTest(props: ThreeElements["group"]) {
  return (
    <group {...props}>
      <Floor />
      <TorusKnot position-y={1} />
    </group>
  );
}

function Floor(props: ThreeElements["mesh"]) {
  const nodes = useMemo(() => {
    const opacityNode = uv().sub(0.5).length().smoothstep(0.5, 0.2);
    const colorNode = mx_noise_vec3(uv().mul(4)).toVarying();

    return {
      colorNode,
      opacityNode,
    };
  }, []);

  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow {...props}>
      <planeGeometry args={[10, 10, 25, 25]} />
      <meshStandardNodeMaterial transparent {...nodes} />
    </mesh>
  );
}

function TorusKnot(props: ThreeElements["mesh"]) {
  const nodes = useMemo(() => {
    const pattern = checker(uv().add(time.mul(0.1)).mul(vec2(30, 5)));
    const colorNode = vec3(pattern, 0, 0);

    const positionNode = positionLocal.add(
      vec3(0, 0, time.add(positionLocal.y.mul(2)).sin().mul(0.3)),
    );

    return {
      colorNode,
      positionNode,
    };
  }, []);

  return (
    <mesh castShadow receiveShadow {...props}>
      <torusKnotGeometry args={[0.5, 0.24, 128, 32]} />
      <meshStandardNodeMaterial {...nodes} />
    </mesh>
  );
}

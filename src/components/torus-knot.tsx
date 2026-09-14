import type { ThreeElements } from "@react-three/fiber/webgpu";
import { useMemo } from "react";
import { checker, positionLocal, time, uv, vec2, vec3 } from "three/tsl";

export default function TorusKnot(props: ThreeElements["mesh"]) {
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

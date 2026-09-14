import { type ThreeElements } from "@react-three/fiber/webgpu";
import { mx_noise_vec3, uv } from "three/tsl";
import { useMemo } from "react";

export default function Floor(props: ThreeElements["mesh"]) {
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
      <planeGeometry args={[10, 10, 10, 10]} />
      <meshStandardNodeMaterial transparent {...nodes} />
    </mesh>
  );
}

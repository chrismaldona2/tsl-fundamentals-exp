import { useGLTF } from "@react-three/drei/webgpu";
import { type ThreeElements } from "@react-three/fiber/webgpu";
import { useMemo } from "react";
import {
  color,
  Fn,
  min,
  mix,
  mx_noise_float,
  mx_noise_vec3,
  positionLocal,
  rotate,
  time,
  uv,
  vec2,
  vec3,
} from "three/tsl";
import { DoubleSide, PlaneGeometry } from "three/webgpu";

export default function CoffeeTest(props: ThreeElements["group"]) {
  const glb = useGLTF("/models/coffee.glb");

  return (
    <group scale={0.5} position-y={0.5} rotation-y={Math.PI / 2} {...props}>
      <primitive object={glb.nodes.baked} />
      <Smoke position={[0, 1.83, 0]} />
    </group>
  );
}

function Smoke(props: ThreeElements["mesh"]) {
  const geometry = useMemo(() => {
    const geo = new PlaneGeometry(1, 1, 16, 64);
    geo.translate(0, 0.5, 0);
    geo.scale(1.5, 6, 1.5);
    return geo;
  }, []);

  const nodes = useMemo(() => {
    const positionNode = Fn(() => {
      const p = positionLocal.toVar();

      // Twist
      const angle = p.y.mul(0.3).sub(time.mul(0.2)).sin().mul(3);
      p.xz.assign(rotate(p.xz, angle));

      // Wind
      const windCoords = p.sub(vec3(0, time.mul(0.3), 0)).mul(0.4);
      const windStrength = uv().y.mul(5);
      const wind = mx_noise_vec3(windCoords).mul(windStrength);
      p.addAssign(wind);

      return p;
    })();

    // TODO: Use a noise texture instead of procedural noise
    const smoke = mx_noise_float(
      uv()
        .mul(vec2(3, 2))
        .sub(vec2(0, time.mul(0.1))),
    );
    const edgeFade = min(
      uv().y.mul(10),
      uv().y.oneMinus().mul(10),
      uv().x.mul(5),
      uv().x.oneMinus().mul(5),
    );
    const opacityNode = smoke.mul(edgeFade).saturate();

    const colorNode = mix(color(0x7e583a), color(0x614432), uv().y);

    return { positionNode, opacityNode, colorNode };
  }, []);

  return (
    <mesh geometry={geometry} {...props}>
      <meshBasicNodeMaterial transparent side={DoubleSide} {...nodes} />
    </mesh>
  );
}

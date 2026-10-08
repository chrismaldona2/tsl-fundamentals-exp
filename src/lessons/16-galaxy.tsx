import { useMemo } from "react";
import { AdditiveBlending } from "three";
import {
  float,
  Fn,
  instanceIndex,
  mix,
  positionLocal,
  range,
  select,
  time,
  TWO_PI,
  uv,
  varying,
  vec3,
} from "three/tsl";
import { randomSphericalPosition } from "../nodes/random";

export default function Galaxy() {
  const count = 10000;

  // Shader
  const { nodes } = useMemo(() => {
    // Varyings
    const progress = varying(float(0));

    // Position
    const positionNode = Fn(() => {
      const position = vec3(instanceIndex, 0, 0);

      // Animation progress
      progress.assign(range(0, 1).add(time.mul(0.02)).fract());

      // Branches
      const angle = instanceIndex
        .toFloat()
        .mod(3)
        .div(3)
        .mul(TWO_PI)
        .add(progress.mul(2).exp());
      const radius = progress.oneMinus().mul(3);
      position.x.assign(angle.cos().mul(radius));
      position.z.assign(angle.sin().mul(radius));

      // Spread
      const spreadRadius = progress.oneMinus().mul(range(0, 1));
      const spread = randomSphericalPosition(instanceIndex, spreadRadius);
      position.addAssign(spread);

      return position;
    })();

    // Scale
    const scaleNode = range(0, 0.025);

    // Stars shape
    const colorNode = Fn(() => {
      const distanceToCenter = uv().sub(0.5).length();

      // Shape 1
      const disc = distanceToCenter.oneMinus().step(0.5);

      // Shape 2
      const circle = disc.sub(distanceToCenter.oneMinus().step(0.6));

      // Ping pong select
      const isDisc = instanceIndex.toFloat().mod(2).equal(0);
      const shape = select(isDisc, disc, circle);

      // Fade
      const fade = progress.remapClamp(0, 0.5, 0, 1).pow(2);

      return vec3(shape.mul(fade).mul(8));
    })();

    return {
      nodes: { positionNode, scaleNode, colorNode },
    };
  }, []);

  return (
    <sprite count={count}>
      <spriteNodeMaterial
        blending={AdditiveBlending}
        depthTest={false}
        depthWrite={false}
        {...nodes}
      />
    </sprite>
  );
}

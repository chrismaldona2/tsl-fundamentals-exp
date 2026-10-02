import {
  distance,
  float,
  Fn,
  hash,
  If,
  int,
  Loop,
  uv,
  vec2,
  vec4,
} from "three/tsl";
import type { Node } from "three/webgpu";

const pointsDistance = Fn(
  ([pointA, pointB]: [Node<"vec2">, Node<"vec2">]) => {
    return distance(pointA, pointB);
  },
  { pointA: "vec2", pointB: "vec2", return: "float" },
);

export const voronoiNormalizeSeed = Fn(
  ([seed, subdivision]: [Node<"int">, Node<"float">]) => {
    return float(seed).div(subdivision.pow(2).sub(1)).fract();
  },
  { seed: "int", subdivision: "float", return: "float" },
);

// Voronoi
export const voronoi = Fn(
  ([position = uv(), subdivision = float(1), seed = int(0)]: [
    Node<"vec2">?,
    Node<"float">?,
    Node<"int">?,
  ]) => {
    const gridPosition = position.mul(subdivision);
    const cellPosition = gridPosition.floor();

    const pointPosition = vec2();
    const pointDistance = float(1e6);
    const pointSeed = float(0);

    const secondPointPosition = vec2();
    const secondPointDistance = float(1e6);
    const fSeed = float(seed);

    // @ts-expect-error Three.js types lack the 'name' property for Loop
    Loop(
      {
        start: float(-1),
        end: float(1),
        type: "float",
        condition: "<=",
        name: "iX",
      },
      ({ iX }: { iX: Node<"float"> }) => {
        // @ts-expect-error
        Loop(
          {
            start: float(-1),
            end: float(1),
            type: "float",
            condition: "<=",
            name: "iY",
          },
          ({ iY }: { iY: Node<"float"> }) => {
            const loopCellPosition = cellPosition.add(vec2(iX, iY));

            const loopPointSeed = loopCellPosition.x
              .mod(subdivision)
              .mul(subdivision)
              .add(loopCellPosition.y.mod(subdivision))
              .add(fSeed);

            const loopPointPosition = vec2(
              hash(loopPointSeed),
              hash(loopPointSeed.add(123).mul(2)),
            ).add(loopCellPosition);

            const loopPointDistance = pointsDistance(
              loopPointPosition,
              gridPosition,
            );

            If(loopPointDistance.lessThan(pointDistance), () => {
              secondPointPosition.assign(pointPosition);
              secondPointDistance.assign(pointDistance);

              pointPosition.assign(loopPointPosition);
              pointDistance.assign(loopPointDistance);
              pointSeed.assign(loopPointSeed);
            }).ElseIf(loopPointDistance.lessThan(secondPointDistance), () => {
              secondPointPosition.assign(loopPointPosition);
              secondPointDistance.assign(loopPointDistance);
            });
          },
        );
      },
    );

    // Distance approximation (cheap)
    const edgeDistanceApproximation = secondPointDistance
      .sub(pointDistance)
      .abs();

    // // Exact distance (expensive)
    // const direction = secondPointPosition.sub(pointPosition).normalize();
    // const middlePoint = pointPosition.add(secondPointPosition).mul(0.5);
    // const edgeDistanceExact = dot(
    //   gridPosition.sub(middlePoint),
    //   direction,
    // ).abs();

    return vec4(
      pointDistance,
      edgeDistanceApproximation,
      0, // edgeDistanceExact
      pointSeed.sub(fSeed),
    );
  },
  { position: "vec2", subdivision: "float", seed: "int", return: "vec4" },
);

import { useUniforms, type ThreeElements } from "@react-three/fiber/webgpu";
import { useMemo } from "react";
import { uv, float, vec3, vec2, bool, Fn, If, uint, Loop } from "three/tsl";
import type { Node } from "three/webgpu";
import { folder, useDebugControls } from "../debug/use-debug-controls";

export default function NodeFunctionsLesson(props: ThreeElements["group"]) {
  return (
    <group {...props}>
      <Floor />
      <TorusKnot position-y={1} />
    </group>
  );
}

const circle = Fn(
  ({
    coords = uv(),
    center = vec2(0.5),
    radius = float(0.25),
    thickness = float(0.02),
    inverted = bool(false),
    discarded = bool(false),
  }: {
    coords?: Node<"vec2">;
    center?: Node<"vec2">;
    radius?: Node<"float">;
    thickness?: Node<"float">;
    inverted?: Node<"bool">;
    discarded?: Node<"bool">;
  }) => {
    const distanceToCenter = coords.distance(center);
    const lineSdf = distanceToCenter.sub(radius);
    const line = lineSdf.abs().step(thickness.div(2));

    If(inverted.not(), () => {
      line.assign(line.oneMinus());
    });

    line.lessThanEqual(0).and(discarded).discard();

    return line;
  },
  {
    coords: "vec2",
    center: "vec2",
    radius: "float",
    thickness: "float",
    inverted: "bool",
    discarded: "bool",
    return: "float",
  },
);

const circles = Fn(
  ({
    coords = uv(),
    center = vec2(0.5),
    radius = float(0.25),
    thickness = float(0.02),
    inverted = bool(false),
    discarded = bool(false),
    count = uint(5),
    span = float(0.1),
  }: {
    coords?: Node<"vec2">;
    center?: Node<"vec2">;
    radius?: Node<"float">;
    thickness?: Node<"float">;
    inverted?: Node<"bool">;
    discarded?: Node<"bool">;
    count?: Node<"uint">;
    span?: Node<"float">;
  }) => {
    const lines = float(0);

    Loop(count, ({ i }) => {
      lines.addAssign(
        circle({
          coords,
          center,
          radius: radius.add(i.toFloat().mul(span)),
          thickness,
          inverted: bool(false),
          discarded: bool(false),
        }),
      );
    });

    If(inverted, () => {
      lines.assign(lines.oneMinus());
    });

    lines.lessThanEqual(0).and(discarded).discard();

    return lines;
  },
);

function Floor(props: ThreeElements["mesh"]) {
  // Uniforms
  const { invert, discard, radius, thickness, count } = useUniforms(
    { invert: false, discard: false, radius: 0.075, thickness: 0.02, count: 5 },
    "node-functions-lesson",
  );

  // Shader
  const nodes = useMemo(() => {
    const colorNode = vec3(
      circles({
        radius,
        thickness,
        inverted: invert,
        discarded: discard,
        count: count.toUint(),
      }),
    );
    const opacityNode = uv().sub(0.5).length().smoothstep(0.5, 0.2);

    return { colorNode, opacityNode };
  }, [invert, discard, radius, thickness, count]);

  // Debug
  useDebugControls("🧩 06 - Node Functions", {
    Floor: folder({
      invert: { target: invert },
      discard: { target: discard },
      radius: { target: radius, min: 0, max: 1, step: 0.001 },
      thickness: { target: thickness, min: 0, max: 0.1, step: 0.01 },
      count: { target: count, min: 0, max: 15, step: 1 },
    }),
  });

  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow {...props}>
      <planeGeometry args={[10, 10, 1, 1]} />
      <meshStandardNodeMaterial transparent {...nodes} />
    </mesh>
  );
}

function TorusKnot(props: ThreeElements["mesh"]) {
  const nodes = useMemo(() => {
    const colorNode = vec3(1);

    return {
      colorNode,
    };
  }, []);

  return (
    <mesh castShadow receiveShadow {...props}>
      <torusKnotGeometry args={[0.5, 0.24, 128, 32]} />
      <meshStandardNodeMaterial {...nodes} />
    </mesh>
  );
}

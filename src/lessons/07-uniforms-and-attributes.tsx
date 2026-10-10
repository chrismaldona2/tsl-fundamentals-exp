// oxlint-disable react/purity
import { type ThreeElements } from "@react-three/fiber/webgpu";
import { useMemo } from "react";
import { BufferAttribute, PlaneGeometry } from "three/webgpu";
import { uv, positionWorld, time, mix, bufferAttribute } from "three/tsl";
import { folder, useDebugControls } from "../debug/use-debug-controls";

export default function UniformsAndAttributesLesson(
  props: ThreeElements["group"],
) {
  return (
    <group {...props}>
      <Floor />
      <TorusKnot position-y={1} />
    </group>
  );
}

function Floor(props: ThreeElements["mesh"]) {
  const { geometry, nodes } = useMemo(() => {
    // Geometry generation
    const geometry = new PlaneGeometry(10, 10, 25, 25);

    // Shader nodes
    const vertices = geometry.attributes.position.count;
    const randomArray = new Float32Array(vertices * 3);
    for (let i = 0; i < vertices; i++) {
      randomArray[i * 3 + 0] = Math.random();
      randomArray[i * 3 + 1] = Math.random();
      randomArray[i * 3 + 2] = Math.random();
    }
    const randomBuffer = new BufferAttribute(randomArray, 3);
    const colorNode = bufferAttribute(randomBuffer, "vec3");
    const opacityNode = uv().sub(0.5).length().smoothstep(0.5, 0.2);

    return {
      geometry,
      nodes: {
        colorNode,
        opacityNode,
      },
    };
  }, []);

  return (
    <mesh
      rotation-x={-Math.PI / 2}
      geometry={geometry}
      receiveShadow
      {...props}
    >
      <meshStandardNodeMaterial transparent {...nodes} />
    </mesh>
  );
}

function TorusKnot(props: ThreeElements["mesh"]) {
  const { TorusKnot } = useDebugControls(
    "📝 05 - Uniform and Attributes",
    {
      TorusKnot: folder("Torus Knot", {
        frequency: {
          value: 4,
          min: 0,
          max: 10,
          step: 0.1,
          name: "Stripe Frequency",
          uniform: true,
        },
        speed: {
          value: 0.5,
          min: 0,
          max: 4,
          step: 0.1,
          name: "Animation Speed",
          uniform: true,
        },
        topColor: { value: "#d2377a", name: "Top Color", uniform: true },
        bottomColor: { value: "#258d5d", name: "Bottom Color", uniform: true },
      }),
    },
    "uniform-and-attributes-lesson",
    { collapsed: true },
  );

  const nodes = useMemo(() => {
    const pattern = positionWorld.y
      .mul(TorusKnot.frequency)
      .sub(time.mul(TorusKnot.speed))
      .fract();

    const colorNode = mix(TorusKnot.topColor, TorusKnot.bottomColor, pattern);

    return {
      colorNode,
    };
  }, [
    TorusKnot.frequency,
    TorusKnot.bottomColor,
    TorusKnot.topColor,
    TorusKnot.speed,
  ]);

  return (
    <mesh castShadow receiveShadow {...props}>
      <torusKnotGeometry args={[0.5, 0.24, 128, 32]} />
      <meshStandardNodeMaterial {...nodes} />
    </mesh>
  );
}

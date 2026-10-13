import {
  useFrame,
  useTexture,
  useThree,
  useUniforms,
  type ThreeElements,
} from "@react-three/fiber/webgpu";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { folder, useDebugControls } from "../debug/use-debug-controls";
import {
  uv,
  vec2,
  mix,
  positionLocal,
  Fn,
  range,
  instanceIndex,
  instancedArray,
  deltaTime,
  If,
  hash,
  min,
  mx_noise_vec3,
  time,
  rotate,
  normalLocal,
} from "three/tsl";
import {
  type Mesh,
  DoubleSide,
  Plane,
  SphereGeometry,
  Vector3,
} from "three/webgpu";
import { randomSphericalPosition } from "../nodes/random";

export default function ClairObscurTitleLesson(props: ThreeElements["group"]) {
  // Lesson camera setup
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    camera.position.set(0, 0, 4);
  }, [camera]);

  return (
    <group {...props}>
      <Lights />
      <Title />
      <Petals />
    </group>
  );
}

function Petals() {
  const renderer = useThree((s) => s.renderer);
  const count = 1500;

  // Assets load
  const alphaTexture = useTexture("/textures/petals-alpha-map.png");

  // Uniforms
  const {
    colorA,
    colorB,
    scale,
    radius,
    windStrength,
    windFrequency,
    windVariation,
    spawnPosition,
  } = useUniforms(
    {
      colorA: "#ffcda3",
      colorB: "#ff142c",
      scale: 0.1,
      radius: 0.35,
      windStrength: 0.3,
      windFrequency: 3,
      windVariation: 0.3,
      spawnPosition: new Vector3(0, -2, 0),
    },
    "clair-obscur-title-petals",
  );

  // Geometry
  const geometry = useMemo(() => {
    const sphere = new SphereGeometry(
      1,
      3,
      3,
      Math.PI * 0.4,
      Math.PI * 0.2,
      Math.PI * 0.4,
      Math.PI * 0.2,
    );
    sphere.translate(0, 0, -1);
    return sphere;
  }, []);

  useEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  // Shader
  const { nodes, computeNodes } = useMemo(() => {
    // Buffers
    const scaleBuffer = range(0.5, 1);
    const colorMixBuffer = range(0, 1);
    const initialPositionsBuffer = instancedArray(count, "vec3");
    const positionsBuffer = instancedArray(count, "vec3");
    const progressBuffer = instancedArray(count, "float");

    // Computes
    const initPetals = Fn(() => {
      const initialPosition = initialPositionsBuffer.element(instanceIndex);
      const position = positionsBuffer.element(instanceIndex);
      const progress = progressBuffer.element(instanceIndex);

      initialPosition.assign(randomSphericalPosition(instanceIndex, 1));
      position.assign(initialPosition.mul(radius).add(spawnPosition));
      progress.assign(hash(instanceIndex.mul(3)));
    })().compute(count);

    const updatePetals = Fn(() => {
      const initialPosition = initialPositionsBuffer.element(instanceIndex);
      const position = positionsBuffer.element(instanceIndex);
      const progress = progressBuffer.element(instanceIndex);

      // Progress
      progress.addAssign(deltaTime.mul(0.6));
      If(progress.greaterThan(1), () => {
        progress.assign(progress.fract());
        position.assign(initialPosition.mul(radius).add(spawnPosition));
      });

      // Wind
      const wind = mx_noise_vec3(
        position.mul(windFrequency).add(time.mul(windVariation)),
      ).mul(windStrength.mul(0.01));
      position.addAssign(wind);
    })().compute(count);

    // Position
    const positionNode = Fn(() => {
      const progress = progressBuffer.element(instanceIndex);
      const position = positionsBuffer.element(instanceIndex);

      // Rotation
      const rotation = position.add(instanceIndex).mul(10);
      positionLocal.assign(rotate(positionLocal, rotation));
      normalLocal.assign(rotate(normalLocal, rotation));

      // Scale
      const progressScale = min(
        progress.remap(0, 0.1, 0, 1),
        progress.remap(0.5, 1, 1, 0),
      ).saturate();
      positionLocal.mulAssign(scaleBuffer, scale, progressScale);

      // Translate
      positionLocal.addAssign(position);

      return positionLocal;
    })();

    // Color
    const colorNode = mix(
      colorA,
      colorB,
      colorMixBuffer.smoothstep(0, 1),
    ).toVertexStage();

    return {
      nodes: { positionNode, colorNode },
      computeNodes: { initPetals, updatePetals },
    };
  }, [
    colorA,
    colorB,
    scale,
    radius,
    windStrength,
    windFrequency,
    windVariation,
    spawnPosition,
  ]);

  // Cursor follow
  useCursorPlaneIntersection(spawnPosition.value);

  // Initialization
  useLayoutEffect(() => {
    renderer.compute(computeNodes.initPetals);
  }, [renderer, computeNodes]);

  // Animation
  useFrame(() => {
    renderer.compute(computeNodes.updatePetals);
  });

  // Debug
  useDebugControls("🌸 Clair Obscur Title", {
    Petals: folder(
      {
        "Color A": { target: colorA },
        "Color B": { target: colorB },
        Scale: { target: scale, min: 0.001, max: 0.5, step: 0.001 },
        Radius: { target: radius, min: 0, max: 2, step: 0.001 },
        "Wind Strength": { target: windStrength, min: 0, max: 1, step: 0.001 },
        "Wind Frequency": {
          target: windFrequency,
          min: 0,
          max: 10,
          step: 0.001,
        },
        "Wind Variation": {
          target: windVariation,
          min: 0,
          max: 2,
          step: 0.001,
        },
      },
      { collapsed: true },
    ),
  });

  return (
    <>
      <mesh
        count={count}
        geometry={geometry}
        castShadow={true}
        receiveShadow={true}
      >
        <meshLambertMaterial
          side={DoubleSide}
          alphaMap={alphaTexture}
          alphaTest={0.1}
          wireframe={false}
          {...nodes}
        />
      </mesh>

      <CursorHelper target={spawnPosition.value} visible={false} />
    </>
  );
}

function useCursorPlaneIntersection(target: Vector3) {
  const [plane] = useState(() => new Plane(new Vector3(0, 0, 1), 0));

  useFrame(({ raycaster, camera, pointer }) => {
    raycaster.setFromCamera(pointer, camera);
    raycaster.ray.intersectPlane(plane, target);
  });
}

function CursorHelper({
  target,
  visible = true,
}: {
  target: Vector3;
  visible?: boolean;
}) {
  const ref = useRef<Mesh>(null);

  useFrame(() => {
    ref.current?.position.copy(target);
  });

  return (
    <mesh ref={ref} visible={visible}>
      <icosahedronGeometry args={[0.03, 1]} />
      <meshBasicMaterial />
    </mesh>
  );
}

function Title() {
  const alphaTexture = useTexture("/textures/clair-obscur-title.png");

  // Uniforms
  const { colorA, colorB } = useUniforms(
    {
      colorA: "#ffdfb3",
      colorB: "#bb4c30",
    },
    "clair-obscur-title",
  );

  // Debug
  useDebugControls("🌸 Clair Obscur Title", {
    Title: folder(
      {
        "Color A": { target: colorA },
        "Color B": { target: colorB },
      },
      { collapsed: true },
    ),
  });

  // Shader
  const { nodes } = useMemo(() => {
    // Color
    const centerDistance = uv().sub(vec2(0.5, 0.6)).length().mul(1.5).min(1);
    const colorNode = mix(colorA, colorB, centerDistance);

    return {
      nodes: {
        colorNode,
      },
    };
  }, [colorA, colorB]);

  return (
    <mesh position-z={-0.05} receiveShadow={true} visible={true}>
      <planeGeometry args={[2, 1]} />
      <meshStandardNodeMaterial
        alphaMap={alphaTexture}
        transparent={true}
        {...nodes}
      />
    </mesh>
  );
}

function Lights() {
  return (
    <directionalLight
      color="#ffffff"
      position={[3.12, 3.12, 2.34]}
      intensity={10}
      castShadow={true}
      shadow-camera-far={10}
      shadow-radius={2}
      shadow-normalBias={-0.1}
    />
  );
}

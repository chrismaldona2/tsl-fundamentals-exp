import {
  useTexture,
  useFrame,
  useThree,
  type ThreeElements,
} from "@react-three/fiber/webgpu";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  type Ref,
} from "react";
import {
  type Material,
  type Mesh,
  type PointLight,
  type MeshStandardMaterial,
  SRGBColorSpace,
} from "three/webgpu";
import {
  deltaTime,
  Fn,
  grayscale,
  hash,
  If,
  instancedArray,
  instanceIndex,
  materialColor,
  mix,
  mrt,
  output,
  positionGeometry,
  range,
  TWO_PI,
  uniform,
  uv,
  vec3,
  vec4,
} from "three/tsl";
import { useGLTF } from "@react-three/drei/webgpu";
import type { GLTF } from "three/examples/jsm/Addons.js";
import { folder, useDebugControls } from "../debug/use-debug-controls";

export default function AnvilLesson(props: ThreeElements["group"]) {
  return (
    <group {...props}>
      <Floor />
      <Anvil />
    </group>
  );
}

// GLB Loader
type GLTFResult = GLTF & {
  nodes: {
    anvil: Mesh;
    hammer: Mesh;
    blade: Mesh;
  };
  materials: {
    ["Material.001"]: MeshStandardMaterial;
    color: MeshStandardMaterial;
    blade: MeshStandardMaterial;
  };
};
const anvilUrl = "/models/anvil.glb";
function useAnvilGLB(): GLTFResult {
  return useGLTF(anvilUrl) as unknown as GLTFResult;
}
useGLTF.preload(anvilUrl);

// API Types
type HammerHandle = { strike(): void };
type BladeHandle = { heat(amount?: number): void };
type SparklesHandle = { explode(lightIntensity?: number): void };

function Anvil(props: ThreeElements["group"]) {
  const glb = useAnvilGLB();
  const hammer = useRef<HammerHandle>(null);
  const blade = useRef<BladeHandle>(null);
  const sparkles = useRef<SparklesHandle>(null);

  const impact = useCallback(() => {
    hammer.current?.strike();
    blade.current?.heat();
    sparkles.current?.explode();
  }, []);

  return (
    <group {...props} dispose={null}>
      <HitBox onHit={impact} />
      <Hammer ref={hammer} />
      <Blade ref={blade} />
      <Sparkles ref={sparkles} />
      <mesh
        geometry={glb.nodes.anvil.geometry}
        material={glb.materials["Material.001"]}
        position={[0, 0.937, 0]}
        rotation={[Math.PI / 2, 0, Math.PI / 2]}
        castShadow
        receiveShadow
      />
    </group>
  );
}

function Hammer({ ref }: { ref?: Ref<HammerHandle> }) {
  const glb = useAnvilGLB();
  const meshRef = useRef<Mesh>(null);

  // API
  useImperativeHandle(
    ref,
    () => ({
      strike() {
        if (!meshRef.current) return;
        meshRef.current.rotation.x = Math.PI / 2;
      },
    }),
    [],
  );

  // Automatic hammer rotation reset
  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30);

    if (!meshRef.current) return;
    meshRef.current.rotation.x += (0 - meshRef.current.rotation.x) * dt;
  });

  return (
    <mesh
      ref={meshRef}
      geometry={glb.nodes.hammer.geometry}
      material={glb.materials.color}
      position={[0.702, 2.333, -1.07]}
      rotation={[0, -0.611, 0, "YXZ"]}
      castShadow
      receiveShadow
    />
  );
}

function Blade({ ref }: { ref?: Ref<BladeHandle> }) {
  const glb = useAnvilGLB();
  const meshRef = useRef<Mesh>(null);

  // Initial material setup
  useLayoutEffect(() => {
    const blade = meshRef.current;
    if (!blade) return;

    const bladeMaterial = blade.material as Material;
    if (bladeMaterial.isMaterial) {
      bladeMaterial.copy(glb.materials.blade);
    }
  }, [glb.materials]);

  // Debug
  const controls = useDebugControls(
    "⚒️ Anvil",
    {
      blade: folder("Blade", {
        impactOffset: {
          name: "Impact Offset",
          value: { x: 0, y: 0, z: 0.3 },
          min: -1,
          max: 1,
          step: 0.001,
          labels: { x: "X", y: "Y", z: "Z" },
          collapsed: true,
        },
        impactPropagation: {
          name: "Impact Propagation",
          value: 1,
          min: 0,
          max: 4,
          step: 0.001,
        },
        colorCenter: { name: "Color Center", value: "#ff007b" },
        colorEdges: { name: "Color Edges", value: "#ffb070" },
        emissiveStrength: { value: 1.5, min: 0, max: 5, step: 0.01 },
      }),
    },
    "anvil-lesson",
  );

  // Shader
  const { nodes, effectStrength } = useMemo(() => {
    // Uniforms
    const effectStrength = uniform(0);
    const {
      impactOffset,
      impactPropagation,
      colorCenter,
      colorEdges,
      emissiveStrength,
    } = controls.blade;

    // Emissiveness
    const emissiveNode = Fn(() => {
      const mask = grayscale(materialColor.rgb).remapClamp(0, 0.13, 1, 0);
      const distanceToImpact = positionGeometry.sub(impactOffset).length();
      const effect = mask
        .sub(distanceToImpact.mul(2))
        .add(effectStrength.mul(impactPropagation))
        .max(0)
        .pow(2);
      const emissiveColor = mix(colorCenter, colorEdges, effect)
        .mul(effect)
        .mul(emissiveStrength);

      return emissiveColor;
    })();

    return {
      nodes: { emissiveNode },
      effectStrength,
    };
  }, [controls.blade]);

  // API
  useImperativeHandle(
    ref,
    () => ({
      heat(amount = 0.15) {
        effectStrength.value += amount;
      },
    }),
    [effectStrength],
  );

  // Automatic blade heat reset
  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30);

    // oxlint-disable-next-line react/immutability
    effectStrength.value += (0 - effectStrength.value) * dt * 0.5;
  });

  return (
    <mesh
      ref={meshRef}
      geometry={glb.nodes.blade.geometry}
      position={[-0.17, 1.916, -0.351]}
      rotation={[0, 0.682, 0]}
      castShadow
      receiveShadow
    >
      <meshPhysicalNodeMaterial {...nodes} />
    </mesh>
  );
}

function Sparkles({ ref }: { ref?: Ref<SparklesHandle> }) {
  const lightRef = useRef<PointLight>(null);
  const renderer = useThree((s) => s.renderer);
  const count = 2000;
  const explosionCount = 150;

  // Debug
  const controls = useDebugControls(
    "⚒️ Anvil",
    {
      sparkles: folder("Sparkles", {
        origin: {
          name: "Origin",
          value: { x: 0.05, y: 1.95, z: -0.1 },
          min: -1,
          max: 1,
          step: 0.001,
          labels: { x: "X", y: "Y", z: "Z" },
          collapsed: true,
        },
        groundHeight: {
          name: "Ground Height",
          value: 0,
          min: -1,
          max: 1,
          step: 0.001,
        },
        size: { name: "Size", value: 0.05, min: 0.001, max: 0.2, step: 0.001 },
        decay: { name: "Life Decay", value: 0.3, min: 0, max: 1, step: 0.001 },
        colorA: { name: "Color A", value: "#ffb070" },
        colorB: { name: "Color B", value: "#ffbb00" },
        emissiveStrength: {
          name: "Emissive Strength",
          value: 45,
          min: 0,
          max: 150,
          step: 0.1,
        },
      }),
    },
    "anvil-lesson",
  );

  // Shader
  const { sparklesIndex, computeNodes, nodes } = useMemo(() => {
    // Uniforms
    const {
      groundHeight,
      size,
      decay,
      colorA,
      colorB,
      emissiveStrength,
      origin,
    } = controls.sparkles;
    const sparklesIndex = uniform(0, "uint");

    // Buffers
    const positions = instancedArray(count, "vec3");
    const velocities = instancedArray(count, "vec3");
    const lives = instancedArray(count, "float");

    // Computes
    const initCompute = Fn(() => {
      const life = lives.element(instanceIndex);
      life.assign(1); // Dead
    })().compute(count);

    const explodeCompute = Fn(() => {
      const currentIndex = instanceIndex.add(sparklesIndex).mod(count);
      const position = positions.element(currentIndex);
      const velocity = velocities.element(currentIndex);
      const life = lives.element(currentIndex);

      const angle = hash(currentIndex).mul(TWO_PI);
      const explosionDirection = vec3(
        angle.sin(),
        hash(currentIndex.add(123).mul(2)).mul(1.25),
        angle.cos(),
      );

      position.assign(origin);
      velocity.assign(explosionDirection.mul(3));
      life.assign(hash(currentIndex.add(234).mul(3)));
    })().compute(explosionCount);

    const updateCompute = Fn(() => {
      const position = positions.element(instanceIndex);
      const velocity = velocities.element(instanceIndex);
      const life = lives.element(instanceIndex);

      // Gravity
      velocity.y.subAssign(deltaTime.mul(9.81));

      // Bounce
      const yLimit = groundHeight.add(size);
      If(position.y.lessThan(yLimit), () => {
        position.y.assign(yLimit);
        velocity.mulAssign(vec3(0.9, -0.5, 0.9));
      });

      // Apply final velocity to position
      position.addAssign(velocity.mul(deltaTime));

      // Life decay
      life.assign(life.add(decay.mul(deltaTime)).min(1));
    })().compute(count);

    // Position
    const positionNode = positions.element(instanceIndex);

    // Scale
    const scaleNode = size
      .mul(range(0.5, 1))
      .mul(lives.element(instanceIndex).remapClamp(0.6, 1, 1, 0));

    // Emissiveness
    const mixFactor = hash(instanceIndex.add(345).mul(4)).smoothstep(0, 1);
    const emissiveNode = mix(colorA, colorB, mixFactor)
      .mul(emissiveStrength)
      .toVertexStage();

    return {
      sparklesIndex,
      computeNodes: {
        initCompute,
        explodeCompute,
        updateCompute,
      },
      nodes: {
        positionNode,
        scaleNode,
        emissiveNode,
      },
    };
  }, [controls.sparkles]);

  // Initialize particles (hidden)
  useLayoutEffect(() => {
    renderer.compute(computeNodes.initCompute);
  }, [renderer, computeNodes.initCompute]);

  // API
  useImperativeHandle(
    ref,
    () => ({
      explode(lightIntensity = 3) {
        renderer.compute(computeNodes.explodeCompute, explosionCount);
        sparklesIndex.value += explosionCount;

        const light = lightRef.current;
        if (!light) return;
        light.intensity += lightIntensity;
      },
    }),
    [renderer, computeNodes.explodeCompute, sparklesIndex],
  );

  // Loop
  useFrame((_, delta) => {
    const dt = Math.min(delta, 1 / 30);

    // Compute sparkles physics
    renderer.compute(computeNodes.updateCompute);

    // Automatic light reset
    const light = lightRef.current;
    if (light) light.intensity += (5 - light.intensity) * dt * 3;
  });

  return (
    <>
      <pointLight
        ref={lightRef}
        color="#ff9955"
        intensity={5}
        position={[0.4, 2.65, 0.35]}
      />
      <sprite count={count}>
        <spriteNodeMaterial color={0x000000} {...nodes} />
      </sprite>
    </>
  );
}

function HitBox({ onHit }: { onHit: () => void }) {
  const renderer = useThree((s) => s.renderer);
  const isHovered = useRef(false);

  const handlePointerEnter = useCallback(() => {
    isHovered.current = true;
    renderer.domElement.style.setProperty("cursor", "pointer", "important");
  }, [renderer]);

  const handlePointerLeave = useCallback(() => {
    isHovered.current = false;
    renderer.domElement.style.removeProperty("cursor");
  }, [renderer]);

  useEffect(() => {
    return () => {
      if (isHovered.current) renderer.domElement.style.removeProperty("cursor");
    };
  }, [renderer]);

  return (
    <mesh
      visible={false}
      scale={[2.5, 4, 3]}
      position-y={2}
      onPointerDown={onHit}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      renderOrder={1}
    >
      <boxGeometry />
    </mesh>
  );
}

function Floor(props: ThreeElements["mesh"]) {
  const diffuse = useTexture("/textures/grass.webp", (tex) => {
    tex.colorSpace = SRGBColorSpace;
  });

  const nodes = useMemo(() => {
    const opacityNode = uv().sub(0.5).length().smoothstep(0.5, 0.2);
    const mrtNode = mrt({ output, normal: vec4(0) });

    return {
      opacityNode,
      mrtNode,
    };
  }, []);

  return (
    <mesh rotation-x={-Math.PI / 2} receiveShadow {...props}>
      <planeGeometry args={[10, 10, 1, 1]} />
      <meshStandardNodeMaterial transparent map={diffuse} {...nodes} />
    </mesh>
  );
}

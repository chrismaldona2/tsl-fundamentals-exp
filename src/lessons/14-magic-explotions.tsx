import {
  useFrame,
  useTexture,
  type ThreeElements,
} from "@react-three/fiber/webgpu";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DoubleSide,
  type Mesh,
  Plane,
  Raycaster,
  RepeatWrapping,
  SRGBColorSpace,
  Vector3,
} from "three/webgpu";
import {
  color,
  Fn,
  frontFacing,
  instanceIndex,
  max,
  min,
  mix,
  mrt,
  output,
  positionLocal,
  texture,
  uniform,
  uniformArray,
  uv,
  vec2,
  vec3,
  vec4,
} from "three/tsl";
import { useDebugControls } from "../debug/use-debug-controls";
import gsap from "gsap";

export default function MagicExplotionsLesson(props: ThreeElements["group"]) {
  return (
    <group {...props}>
      <ExplosionsProvider>
        <ExplosionShootingGround />
        <Floor />
      </ExplosionsProvider>
    </group>
  );
}

function ExplosionsSystem({
  registerTriggerFn,
}: {
  registerTriggerFn?: (fn: TriggerExplotionFn) => () => void;
}) {
  const maxCount = 100;
  const meshRef = useRef<Mesh>(null);
  const state = useRef({
    index: 0,
    count: 0,
  });
  const tweens = useRef(new Set<gsap.core.Tween>());

  // Assets load
  const noiseTexture = useTexture(
    "/textures/simplex-tiling-noise.png",
    (tex) => {
      tex.wrapS = RepeatWrapping;
      tex.wrapT = RepeatWrapping;
    },
  );

  // Debug
  const controls = useDebugControls(
    "🪄 Magic Explotions",
    {
      primaryEmissiveColor: {
        name: "Primary Emissive Color",
        value: "#1111ff",
      },
      secondaryEmissiveColor: {
        name: "Secondary Emissive Color",
        value: "#ff1111",
      },
      emissiveStrength: {
        name: "Emissive Strength",
        value: 20,
        min: 1,
        max: 100,
        step: 0.01,
      },
    },
    "magic_explotion",
  );

  // Shader nodes
  const { nodes, triggerExplotion } = useMemo(() => {
    // Uniforms
    const { primaryEmissiveColor, secondaryEmissiveColor, emissiveStrength } =
      controls;
    const startIndex = uniform(0, "uint");

    // Buffers setup
    const positionsBuffer = uniformArray<"vec3">([], "vec3");
    const radiusBuffer = uniformArray<"float">([], "float");
    const progressBuffer = uniformArray<"float">([], "float");
    for (let i = 0; i < maxCount; i++) {
      positionsBuffer.array[i] = new Vector3();
      radiusBuffer.array[i] = 1;
      progressBuffer.array[i] = 0;
    }

    // Buffers
    const arrayInstanceIndex = instanceIndex.add(startIndex).mod(maxCount);
    const position = positionsBuffer.element(arrayInstanceIndex);
    const radius = radiusBuffer.element(arrayInstanceIndex);
    const progress = progressBuffer.element(arrayInstanceIndex);

    // Color
    const colorNode = color(0x000000);

    // Mask
    const maskNode = Fn(() => {
      const noise1Uv = uv().mul(vec2(1, 3));
      const noise1 = texture(noiseTexture, noise1Uv).r;
      const noise2Uv = uv().mul(vec2(1, 5));
      const noise2 = texture(noiseTexture, noise2Uv).g;
      const noise = noise1.add(noise2).div(2).pow(2);

      return vec3(noise.sub(progress)).greaterThan(0);
    })();

    // Emissive
    const emissiveNode = Fn(() => {
      const emissiveMix = progress.smoothstep(0, 0.7);
      const emissiveColor = mix(
        primaryEmissiveColor,
        secondaryEmissiveColor,
        emissiveMix,
      ).toVertexStage();
      const backFacingMask = frontFacing.toFloat().oneMinus();

      return emissiveColor.mul(emissiveStrength).mul(backFacingMask);
    })();

    // Vertex position
    const positionNode = Fn(() => {
      // Scale
      const radiusIn = progress.remap(0, 0.075, 0, 1);
      const radiusOut = progress.remap(0.075, 1, 1, 0.3);
      const radiusFinal = min(radiusIn, radiusOut)
        .oneMinus()
        .pow(2)
        .oneMinus()
        .mul(radius);
      positionLocal.mulAssign(radiusFinal);

      // Translation
      positionLocal.addAssign(position);

      // Floor clamp
      positionLocal.y.assign(max(positionLocal.y, 0.01));

      return positionLocal;
    })();

    // Trigger explotion function
    const triggerExplotion: TriggerExplotionFn = (
      position: Vector3 = new Vector3(),
      radius: number = 1,
    ) => {
      const mesh = meshRef.current;
      if (!mesh) return;

      const currentIndex = state.current.index;
      (positionsBuffer.array[currentIndex] as Vector3).copy(position);
      radiusBuffer.array[currentIndex] = radius;
      progressBuffer.array[currentIndex] = 0;

      // Progress animation
      const progress = { value: 0 };
      const tween = gsap.to(progress, {
        value: 1,
        duration: 2,
        ease: "linear",
        onUpdate: () => {
          progressBuffer.array[currentIndex] = progress.value;
        },
        onComplete: () => {
          state.current.count--;
          mesh.count = Math.min(state.current.count, maxCount);
          startIndex.value++;
          if (mesh.count === 0) mesh.visible = false;
        },
      });
      tweens.current.add(tween);

      state.current.index = (state.current.index + 1) % maxCount;
      state.current.count++;
      mesh.count = Math.min(state.current.count, maxCount);
      mesh.visible = true;
    };

    return {
      nodes: {
        colorNode,
        maskNode,
        emissiveNode,
        positionNode,
      },
      triggerExplotion,
    };
  }, [noiseTexture, controls]);

  useEffect(() => {
    return registerTriggerFn?.(triggerExplotion);
  }, [registerTriggerFn, triggerExplotion]);

  useEffect(() => {
    const tweensSet = tweens.current;
    return () => {
      tweensSet.forEach((t) => t.kill());
      tweensSet.clear();
    };
  }, []);

  return (
    <mesh ref={meshRef} count={0} visible={false} castShadow>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicNodeMaterial side={DoubleSide} {...nodes} />
    </mesh>
  );
}

// Explotions environment
type TriggerExplotionFn = (position?: Vector3, radius?: number) => void;
type ExplosionsApi = { trigger: TriggerExplotionFn };
const ExplosionsContext = createContext<ExplosionsApi | null>(null);
export function ExplosionsProvider({ children }: { children: ReactNode }) {
  const triggerRef = useRef<TriggerExplotionFn | null>(null);

  const api = useMemo<ExplosionsApi>(
    () => ({
      trigger: (position, radius) => triggerRef.current?.(position, radius),
    }),
    [],
  );

  const register = useCallback((fn: TriggerExplotionFn) => {
    triggerRef.current = fn;
    return () => {
      if (triggerRef.current === fn) triggerRef.current = null;
    };
  }, []);

  return (
    <ExplosionsContext.Provider value={api}>
      <ExplosionsSystem registerTriggerFn={register} />
      {children}
    </ExplosionsContext.Provider>
  );
}

function useExplosions() {
  const context = useContext(ExplosionsContext);
  if (!context) throw new Error("Must be used within ExplosionsProvider");
  return context.trigger;
}

function ExplosionShootingGround() {
  const trigger = useExplosions();

  const [floorPlane] = useState(() => new Plane(new Vector3(0, 1, 0), 0));
  const [intersectPoint] = useState(() => new Vector3());
  const [privateRaycaster] = useState(() => new Raycaster());
  const isShooting = useRef(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) =>
      e.code === "Space" && (isShooting.current = true);
    const up = (e: KeyboardEvent) =>
      e.code === "Space" && (isShooting.current = false);

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useFrame(
    ({ pointer, camera }) => {
      if (!isShooting.current) return;

      privateRaycaster.setFromCamera(pointer, camera);
      const hit = privateRaycaster.ray.intersectPlane(
        floorPlane,
        intersectPoint,
      );

      if (hit) {
        hit.x += (Math.random() - 0.5) * 0.5;
        hit.z += (Math.random() - 0.5) * 0.5;
        trigger(hit, 0.5 + Math.random() * 0.5);
      }
    },
    { fps: 25 },
  );

  return null;
}

function Floor(props: ThreeElements["mesh"]) {
  const diffuseTexture = useTexture("/textures/grass.webp", (tex) => {
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

  const triggerExplosion = useExplosions();

  return (
    <mesh
      onPointerDown={({ point }) => triggerExplosion(point)}
      rotation-x={-Math.PI / 2}
      renderOrder={-1}
      receiveShadow
      {...props}
    >
      <planeGeometry args={[10, 10, 1, 1]} />
      <meshStandardNodeMaterial map={diffuseTexture} transparent {...nodes} />
    </mesh>
  );
}

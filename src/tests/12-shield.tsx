import {
  useFrame,
  useNodes,
  useTexture,
  type ThreeElements,
} from "@react-three/fiber/webgpu";
import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import {
  AdditiveBlending,
  DoubleSide,
  Matrix4,
  Mesh,
  Ray,
  RepeatWrapping,
  Sphere,
  SRGBColorSpace,
  Vector3,
  Vector4,
  type MeshStandardNodeMaterial,
  type Node,
} from "three/webgpu";
import {
  add,
  dot,
  float,
  Fn,
  Loop,
  max,
  mix,
  mrt,
  mul,
  normalView,
  output,
  positionLocal,
  positionViewDirection,
  positionWorld,
  texture,
  time,
  TWO_PI,
  uniform,
  uniformArray,
  uv,
  vec2,
  vec4,
} from "three/tsl";
import { useGLTF } from "@react-three/drei/webgpu";
import { useDebugControls } from "../debug/use-debug-controls";
import TransformControls from "../components/transform-controls";
import gsap from "gsap";

export default function ShieldLesson(props: ThreeElements["group"]) {
  return (
    <group {...props}>
      <Shield />
      <Floor />
      <Anvil />
    </group>
  );
}

type ShieldNodeScope = {
  junctionNode: Node<"vec3">;
  shieldCenter: UniformNode<Vector3>;
};

const shieldRaycastEnv = {
  inverse: new Matrix4(),
  ray: new Ray(),
  sphere: new Sphere(new Vector3(), 1),
  hit: new Vector3(),
};

function Shield(props: ThreeElements["mesh"]) {
  const [mesh] = useState(() => new Mesh());

  // Assets load
  const hexagonsTexture = useTexture("/textures/hexagons.png", (tex) => {
    tex.wrapS = RepeatWrapping;
    tex.wrapT = RepeatWrapping;
  });

  // Debug
  const {
    radius,
    primaryColor,
    secondaryColor,
    strength,
    edgeThickness,
    hexTilingX,
    hexTilingY,
    linesDensity,
    linesSpeed,
    junctionFade,
  } = useDebugControls(
    "🛡️ Shield",
    {
      radius: { name: "Radius", value: 2, min: 0.01, max: 6, step: 0.01 },
      primaryColor: { name: "Primary Color", value: "#1d52d5" },
      secondaryColor: { name: "Secondary Color", value: "#da263d" },
      strength: { name: "Strength", value: 7, min: 0, max: 20, step: 0.01 },
      edgeThickness: {
        name: "Edge Thickness",
        value: 5,
        min: 1,
        max: 10,
        step: 0.1,
      },
      hexTilingX: { name: "Hex Tiling X", value: 6, min: 1, max: 20, step: 1 },
      hexTilingY: { name: "Hex Tiling Y", value: 4, min: 1, max: 20, step: 1 },
      linesDensity: {
        name: "Lines Density",
        value: 20,
        min: 1,
        max: 50,
        step: 1,
      },
      linesSpeed: {
        name: "Lines Speed",
        value: 0.05,
        min: 0,
        max: 0.2,
        step: 0.001,
      },
      junctionFade: {
        name: "Junction Fade",
        value: 0.2,
        min: 0.01,
        max: 1,
        step: 0.01,
      },
    },
    "shield",
    { collapsed: true },
  );

  // Custom raycaster (sphere shape based)
  const customRaycast = useCallback<Mesh["raycast"]>(
    (raycaster, intersects) => {
      const { inverse, ray, sphere, hit } = shieldRaycastEnv;

      inverse.copy(mesh.matrixWorld).invert();
      ray.copy(raycaster.ray).applyMatrix4(inverse);

      sphere.radius = radius.value;
      if (!ray.intersectSphere(sphere, hit)) return;

      hit.applyMatrix4(mesh.matrixWorld);
      const distance = raycaster.ray.origin.distanceTo(hit);
      if (distance < raycaster.near || distance > raycaster.far) return;

      intersects.push({
        distance,
        point: hit.clone(),
        object: mesh,
      });
    },
    [mesh, radius],
  );

  // Impacts manager
  const impactsData = useMemo(() => {
    const count = 5;
    const array = Array.from({ length: count }, () => new Vector4(0, 0, 0, 0));
    const uniforms = uniformArray<"vec4">(array, "vec4");
    const state = { index: 0 };

    const addImpact = (localHitPoint: Vector3, impactRadius = 1) => {
      const impact = array[state.index];

      impact.x = localHitPoint.x;
      impact.y = localHitPoint.y;
      impact.z = localHitPoint.z;

      gsap.to(impact, {
        w: impactRadius,
        duration: 0.5,
        ease: "power2.out",
        onComplete: () => {
          gsap.to(impact, {
            w: 0,
            duration: 1,
            ease: "power2.in",
          });
        },
      });

      state.index = (state.index + 1) % count;
    };

    return { count, uniforms, addImpact };
  }, []);

  // Shader
  const nodes = useMemo(() => {
    // Scale
    const positionNode = positionLocal.mul(radius);

    // Emissiveness
    const emissiveNode = Fn(() => {
      // Impacts
      const impactFactor = float(0);
      Loop(impactsData.count, ({ i }) => {
        const impactData = impactsData.uniforms.element(i);
        const impactDistance = impactData.xyz.distance(positionLocal);
        const impact = impactDistance.div(impactData.w).oneMinus().max(0);
        impactFactor.assign(max(impactFactor, impact));
      });
      impactFactor.assign(impactFactor.remap(0.4, 0, 1, 0));

      // Fresnel
      const fresnel = dot(positionViewDirection, normalView).abs().oneMinus();

      // Hexagons
      const hexagonsColor = texture(
        hexagonsTexture,
        uv().mul(vec2(hexTilingX, hexTilingY)),
      );
      const hexagonsStep = max(
        time.add(hexagonsColor.g.mul(TWO_PI)).sin().remap(-1, 1),
        impactFactor,
      );
      const hexagonsMask = hexagonsColor.r.step(hexagonsStep).oneMinus();
      const hexagonsPolarMask = uv().y.sub(0.5).abs().remapClamp(0.35, 0.2);
      const hexagonsFresnelMask = max(fresnel.pow(2), impactFactor);
      const hexagonsFill = max(hexagonsColor.r, impactFactor);
      const hexagons = mul(
        hexagonsMask,
        hexagonsColor.b,
        hexagonsPolarMask,
        hexagonsFresnelMask,
        hexagonsFill,
      );

      // Lines
      const linesStrength = positionWorld.y
        .mul(3)
        .sub(time)
        .sin()
        .remap(-1, 1)
        .mul(0.05);
      const lines = positionWorld.y
        .add(time.mul(linesSpeed))
        .mul(linesDensity)
        .fract()
        .pow(3)
        .mul(linesStrength);

      // Final emissive
      const emissiveStrength = add(
        hexagons,
        fresnel.pow(edgeThickness),
        lines,
      ).mul(strength);
      return mix(primaryColor, secondaryColor, emissiveStrength).mul(
        emissiveStrength,
      );
    })();

    return {
      positionNode,
      emissiveNode,
    };
  }, [
    hexagonsTexture,
    impactsData,
    radius,
    primaryColor,
    secondaryColor,
    strength,
    hexTilingX,
    hexTilingY,
    linesDensity,
    linesSpeed,
    edgeThickness,
  ]);

  // Shared nodes
  const { shieldCenter } = useNodes<ShieldNodeScope>(() => {
    const shieldCenter = uniform(new Vector3());
    const junctionNode = Fn(() => {
      const sdf = positionWorld.distance(shieldCenter).sub(radius);
      const junctionMask = sdf
        .remapClamp(0, junctionFade.negate(), 1, 0)
        .mul(sdf.negate().step(0))
        .pow(3)
        .mul(strength);

      return mix(primaryColor, secondaryColor, junctionMask).mul(junctionMask);
    })();
    return { junctionNode, shieldCenter };
  }, "shield");
  useFrame(() => mesh.getWorldPosition(shieldCenter.value));

  return (
    <>
      <TransformControls object={mesh} />
      <primitive
        object={mesh}
        raycast={customRaycast}
        onPointerDown={(e) =>
          impactsData.addImpact(mesh.worldToLocal(e.point.clone()))
        }
        {...props}
      >
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicNodeMaterial
          color={0x000000}
          side={DoubleSide}
          blending={AdditiveBlending}
          transparent
          {...nodes}
        />
      </primitive>
    </>
  );
}

function Floor(props: ThreeElements["mesh"]) {
  const diffuse = useTexture("/textures/grass.webp", (tex) => {
    tex.colorSpace = SRGBColorSpace;
  });

  const shieldNodes = useNodes<ShieldNodeScope>("shield");

  const nodes = useMemo(() => {
    const opacityNode = uv().sub(0.5).length().smoothstep(0.5, 0.2);
    const mrtNode = mrt({ output, normal: vec4(0) });
    const emissiveNode = shieldNodes.junctionNode;

    return {
      opacityNode,
      mrtNode,
      emissiveNode,
    };
  }, [shieldNodes]);

  return (
    <mesh rotation-x={-Math.PI / 2} renderOrder={-1} receiveShadow {...props}>
      <planeGeometry args={[10, 10, 1, 1]} />
      <meshStandardNodeMaterial transparent map={diffuse} {...nodes} />
    </mesh>
  );
}

function Anvil(props: ThreeElements["group"]) {
  const glb = useGLTF("/models/anvil.glb");

  const shieldNodes = useNodes<ShieldNodeScope>("shield");

  useLayoutEffect(() => {
    glb.scene.traverse((child) => {
      const mesh = child as Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const material = Array.isArray(mesh.material)
          ? mesh.material[0]
          : mesh.material;
        if (
          material.type === "MeshStandardMaterial" ||
          material.type === "MeshStandardNodeMaterial"
        ) {
          const nodeMaterial = material as MeshStandardNodeMaterial;
          nodeMaterial.emissiveNode = shieldNodes.junctionNode;
          nodeMaterial.needsUpdate = true;
        }
      }
    });
  }, [glb, shieldNodes]);

  return (
    <group {...props} dispose={null}>
      <primitive object={glb.scene} />
    </group>
  );
}

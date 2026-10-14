import { useFrame, useThree, useUniforms } from "@react-three/fiber/webgpu";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  deltaTime,
  dot,
  EPSILON,
  Fn,
  hash,
  If,
  instancedArray,
  instanceIndex,
  Loop,
  positionLocal,
  vec3,
} from "three/tsl";
import { useDebugControls } from "../debug/use-debug-controls";
import { Vector3, Plane, Raycaster, type Mesh } from "three/webgpu";

export default function SpheresParticlesPhysicsLesson() {
  const count = 6000;
  const renderer = useThree((s) => s.renderer);

  // Uniforms
  const {
    spheresColor,
    emissiveColor,
    radius,
    gravityStrength,
    impactDamping,
    generalDamping,
    heatDamping,
    heatImpactStrength,
    cursorPosition,
    cursorVelocity,
    cursorRadius,
    cursorStrength,
    cursorHeatImpactStrength,
  } = useUniforms(
    {
      spheresColor: "#5c5c5c",
      emissiveColor: "#ff3f0f",
      radius: 0.15,
      gravityStrength: 0.05,
      impactDamping: 0.05,
      generalDamping: 0.4,
      heatDamping: 3,
      heatImpactStrength: 30,
      cursorPosition: new Vector3(),
      cursorVelocity: new Vector3(),
      cursorRadius: 1.75,
      cursorStrength: 0.09,
      cursorHeatImpactStrength: 50,
    },
    "spheres-particles-physics-lesson",
  );

  // Debug
  useDebugControls("🪩 Spheres Particles Physics", {
    "Spheres Color": { target: spheresColor },
    "Emissive Color": { target: emissiveColor },
    Radius: { target: radius, min: 0.001, max: 1, step: 0.001 },
    "Gravity Strength": {
      target: gravityStrength,
      min: 0,
      max: 0.2,
      step: 0.001,
    },
    "Impact Damping": {
      target: impactDamping,
      min: 0,
      max: 0.1,
      step: 0.001,
    },
    "General Damping": {
      target: generalDamping,
      min: 0,
      max: 1,
      step: 0.001,
    },
    "Heat Damping": { target: heatDamping, min: 0, max: 10, step: 0.001 },
    "Heat Impact Strength": {
      target: heatImpactStrength,
      min: 0,
      max: 150,
      step: 0.001,
    },
    "Cursor Radius": { target: cursorRadius, min: 0, max: 5, step: 0.001 },
    "Cursor Strength": {
      target: cursorStrength,
      min: 0,
      max: 0.25,
      step: 0.001,
    },
    "Cursor Heat Impact Strength": {
      target: cursorHeatImpactStrength,
      min: 0,
      max: 150,
      step: 0.001,
    },
  });

  // Shader
  const { nodes, computeNodes } = useMemo(() => {
    // Buffers
    const positionsBuffer = instancedArray(count, "vec3");
    const velocitiesBuffer = instancedArray(count, "vec3");
    const heatsBuffer = instancedArray(count, "float");

    // Computes
    const initCompute = Fn(() => {
      const position = positionsBuffer.element(instanceIndex);
      position.assign(
        vec3(
          hash(instanceIndex),
          hash(instanceIndex.add(234).mul(2)),
          hash(instanceIndex.add(567).mul(3)),
        )
          .sub(0.5)
          .mul(10),
      );
    })().compute(count);

    const updateCompute = Fn(() => {
      const clampedDelta = deltaTime.min(1 / 30);
      const aPosition = positionsBuffer.element(instanceIndex);
      const aVelocity = velocitiesBuffer.element(instanceIndex);
      const aHeat = heatsBuffer.element(instanceIndex);

      // Cursor
      const cursorDistance = aPosition.distance(cursorPosition);
      const cursorDistanceRatio = cursorDistance
        .div(cursorRadius)
        .oneMinus()
        .max(0);
      const _cursorVelocity = cursorVelocity
        .mul(cursorDistanceRatio)
        .mul(cursorStrength);
      aVelocity.addAssign(_cursorVelocity);
      aHeat.addAssign(_cursorVelocity.length().mul(cursorHeatImpactStrength));

      // Center gravity
      const toCenter = aPosition.negate().normalize();
      const gravityVelocity = toCenter.mul(gravityStrength).mul(clampedDelta);
      aVelocity.addAssign(gravityVelocity);

      // Collisions
      // @ts-expect-error Three.js types lack the 'name' property for Loop
      Loop(
        { start: instanceIndex.add(1), end: count, condition: "<", name: "i" },
        ({ i }) => {
          const bPosition = positionsBuffer.element(i);
          const bVelocity = velocitiesBuffer.element(i);
          const bHeat = heatsBuffer.element(i);

          // Relation to sphere A
          const positionDelta = bPosition.sub(aPosition);
          const distance = positionDelta.length();
          const direction = positionDelta.div(distance.max(EPSILON)); // Same as positionDelta.normalize()

          // Is touching
          const radius2 = radius.mul(2);
          If(distance.lessThan(radius2), () => {
            // Move on oposite directions when overlap
            const overlap = radius2.sub(distance);
            const avoidance = direction.mul(overlap.div(2));
            aPosition.subAssign(avoidance);
            bPosition.addAssign(avoidance);

            // Impact velocities
            const relativeVelocity = aVelocity.sub(bVelocity);
            const impactStrength = dot(relativeVelocity, direction);
            const impactVelocity = direction
              .mul(impactStrength)
              .mul(impactDamping.oneMinus());
            aVelocity.subAssign(impactVelocity);
            bVelocity.addAssign(impactVelocity);

            // Impact heat
            const heat = impactStrength
              .sub(0.01)
              .max(0)
              .mul(heatImpactStrength);
            aHeat.addAssign(heat);
            bHeat.addAssign(heat);
          });
        },
      );

      // Apply velocity
      aPosition.addAssign(aVelocity);

      // General damping
      aVelocity.mulAssign(generalDamping.mul(clampedDelta).oneMinus());

      // Heat damping
      aHeat.mulAssign(heatDamping.mul(clampedDelta).oneMinus());
    })().compute(count);

    // Position
    const positionNode = Fn(() => {
      // Scale
      positionLocal.mulAssign(radius);

      // Translate
      positionLocal.addAssign(positionsBuffer.element(instanceIndex));

      return positionLocal;
    })();

    // Emissiveness
    const heat = heatsBuffer.element(instanceIndex);
    const emissiveNode = emissiveColor.mul(heat);

    // Color
    const colorNode = spheresColor;

    return {
      nodes: { positionNode, emissiveNode, colorNode },
      computeNodes: { initCompute, updateCompute },
    };
  }, [
    spheresColor,
    emissiveColor,
    radius,
    gravityStrength,
    impactDamping,
    generalDamping,
    heatDamping,
    heatImpactStrength,
    cursorPosition,
    cursorVelocity,
    cursorRadius,
    cursorStrength,
    cursorHeatImpactStrength,
  ]);

  // Initialization
  useLayoutEffect(() => {
    renderer.compute(computeNodes.initCompute);
  }, [renderer, computeNodes]);

  // Animation
  useFrame(() => {
    renderer.compute(computeNodes.updateCompute);
  });

  // Cursor tracking
  useCursorPlaneIntersection(cursorPosition.value, cursorVelocity.value);

  return (
    <>
      <mesh
        count={count}
        castShadow={true}
        receiveShadow={true}
        frustumCulled={false}
      >
        <icosahedronGeometry args={[1, 2]} />
        <meshLambertMaterial color="#ffffff" {...nodes} />
      </mesh>

      <CursorHelper target={cursorPosition.value} radius={0.1} />
    </>
  );
}

function useCursorPlaneIntersection(
  positionTarget: Vector3,
  velocityTarget?: Vector3,
) {
  const [plane] = useState(() => new Plane(new Vector3(0, 0, 1), 0));
  const [raycaster] = useState(() => new Raycaster());
  const [intersect] = useState(() => new Vector3());

  useFrame(({ camera, pointer }) => {
    raycaster.setFromCamera(pointer, camera);
    plane.normal.copy(camera.position).normalize();
    raycaster.ray.intersectPlane(plane, intersect);

    velocityTarget?.copy(intersect).sub(positionTarget);
    positionTarget.copy(intersect);
  });
}

function CursorHelper({
  target,
  visible = true,
  radius = 0.03,
}: {
  target: Vector3;
  visible?: boolean;
  radius?: number;
}) {
  const ref = useRef<Mesh>(null);

  useFrame(() => {
    ref.current?.position.copy(target);
  });

  return (
    <mesh ref={ref} visible={visible}>
      <icosahedronGeometry args={[radius, 1]} />
      <meshBasicMaterial />
    </mesh>
  );
}

import {
  useBuffers,
  useFrame,
  useTexture,
  type ThreeElements,
} from "@react-three/fiber/webgpu";
import { useLayoutEffect, useMemo, useRef } from "react";
import {
  Euler,
  InstancedBufferAttribute,
  InstancedInterleavedBuffer,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardNodeMaterial,
  Quaternion,
  SRGBColorSpace,
  Vector3,
} from "three/webgpu";
import {
  Fn,
  instance,
  instancedArray,
  instancedBufferAttribute,
  instanceIndex,
  mrt,
  normalLocal,
  output,
  positionLocal,
  rotate,
  time,
  uniformArray,
  uv,
  vec4,
} from "three/tsl";
import { useDebugControls } from "../debug/use-debug-controls";

export default function InstancesLesson(props: ThreeElements["group"]) {
  return (
    <group {...props}>
      <Method_8 rotation-y={0.6} />
      <Floor />
    </group>
  );
}

// Without Instancing
function Method_1(props: ThreeElements["group"]) {
  const count = 5;

  // Material
  const material = useMemo(() => {
    const material = new MeshStandardNodeMaterial();

    material.positionNode = Fn(() => {
      // Wave
      const wave = time.add(positionLocal.y.mul(3)).sin().mul(0.25);
      positionLocal.z.addAssign(wave);
      return positionLocal;
    })();

    return material;
  }, []);

  return (
    <group {...props}>
      {Array.from({ length: count }).map((_, i) => {
        const progress = i / (count - 1);
        const position = {
          x: (progress - 0.5) * 4,
          y: 1,
          z: 0,
        };
        const rotation = {
          x: 0,
          y: progress * 3,
          z: 0,
        };

        return (
          <mesh
            key={`instance-method-1-${i}`}
            position={[position.x, position.y, position.z]}
            rotation={[rotation.x, rotation.y, rotation.z]}
            material={material}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[0.5, 1, 0.5, 12, 12, 12]} />
          </mesh>
        );
      })}
    </group>
  );
}

// Instanced Mesh
function Method_2(props: ThreeElements["group"]) {
  const meshRef = useRef<InstancedMesh>(null);
  const count = 5;

  // Instance matrix setup
  useLayoutEffect(() => {
    if (!meshRef.current) return;

    const position = new Vector3();
    const rotation = new Quaternion();
    const euler = new Euler();
    const scale = new Vector3(1, 1, 1);
    const matrix = new Matrix4();

    for (let i = 0; i < count; i++) {
      const progress = i / (count - 1);
      position.set((progress - 0.5) * 4, 0, 0);
      euler.set(0, progress * 3, 0);
      rotation.setFromEuler(euler);
      matrix.compose(position, rotation, scale);
      meshRef.current.setMatrixAt(i, matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  }, []);

  const nodes = useMemo(() => {
    return {
      positionNode: Fn(() => {
        // Wave
        const wave = time.add(positionLocal.y.mul(3)).sin().mul(0.25);
        positionLocal.z.addAssign(wave);

        return positionLocal;
      })(),
    };
  }, []);

  return (
    <group {...props}>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, count]}
        position-y={1}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[0.5, 1, 0.5, 12, 12, 12]} />
        <meshStandardNodeMaterial {...nodes} />
      </instancedMesh>
    </group>
  );
}

// Instance Index
function Method_3(props: ThreeElements["group"]) {
  const meshRef = useRef<Mesh>(null);
  const count = 5;

  // Debug
  const controls = useDebugControls(
    "Instances",
    {
      count: {
        value: count,
        min: 1,
        max: 20,
        step: 1,
        onChange: (v: number) => {
          if (meshRef.current) meshRef.current.count = v;
        },
      },
    },
    "instance_index_method",
  );

  // Shader
  const nodes = useMemo(
    () => ({
      positionNode: Fn(() => {
        const progress = instanceIndex.toFloat().div(controls.count.sub(1));

        // Wave
        const wave = time.add(positionLocal.y.mul(3)).sin().mul(0.25);
        positionLocal.z.addAssign(wave);

        // Rotation
        positionLocal.xz.assign(rotate(positionLocal.xz, progress.mul(3)));
        normalLocal.xz.assign(rotate(normalLocal.xz, progress.mul(3)));

        // Translation
        positionLocal.x.addAssign(progress.sub(0.5).mul(4));

        return positionLocal;
      })(),
    }),
    [controls],
  );

  return (
    <group {...props}>
      <mesh ref={meshRef} count={count} position-y={1} castShadow receiveShadow>
        <boxGeometry args={[0.5, 1, 0.5, 12, 12, 12]} />
        <meshStandardNodeMaterial {...nodes} />
      </mesh>
    </group>
  );
}

// Instance Buffer Attribute
function Method_4(props: ThreeElements["group"]) {
  const count = 5;

  // Shader
  const nodes = useMemo(() => {
    // Buffers creation
    const rotationsArray = new Float32Array(count * 1);
    const rotationsBuffer = new InstancedBufferAttribute(rotationsArray, 1);

    const positionsArray = new Float32Array(count * 3);
    const positionsBuffer = new InstancedBufferAttribute(positionsArray, 3);

    // Buffers fill
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const progress = i / (count - 1);

      positionsArray[i3 + 0] = (progress - 0.5) * 4;
      positionsArray[i3 + 1] = 0;
      positionsArray[i3 + 2] = 0;

      rotationsArray[i] = progress * 3;
    }

    const positionNode = Fn(() => {
      // Buffers data
      const instancedPosition = instancedBufferAttribute<"vec3">(
        positionsBuffer,
        "vec3",
      );
      const instancedRotation = instancedBufferAttribute<"float">(
        rotationsBuffer,
        "float",
      );

      // Wave
      const wave = time.add(positionLocal.y.mul(3)).sin().mul(0.25);
      positionLocal.z.addAssign(wave);

      // Rotation
      positionLocal.xz.assign(rotate(positionLocal.xz, instancedRotation));
      normalLocal.xz.assign(rotate(normalLocal.xz, instancedRotation));

      // Translation
      positionLocal.addAssign(instancedPosition);

      return positionLocal;
    })();

    return {
      positionNode,
    };
  }, []);

  return (
    <group {...props}>
      <mesh count={count} position-y={1} castShadow receiveShadow>
        <boxGeometry args={[0.5, 1, 0.5, 12, 12, 12]} />
        <meshStandardNodeMaterial {...nodes} />
      </mesh>
    </group>
  );
}

// Instanced Interleaved Buffer
function Method_5(props: ThreeElements["group"]) {
  const count = 5;

  // Shader
  const nodes = useMemo(() => {
    // Buffers creation
    const array = new Float32Array(count * 4);
    const buffer = new InstancedInterleavedBuffer(array, 4);

    // Buffers fill
    for (let i = 0; i < count; i++) {
      const i4 = i * 4;
      const progress = i / (count - 1);

      array[i4 + 0] = (progress - 0.5) * 4;
      array[i4 + 1] = 0;
      array[i4 + 2] = 0;
      array[i4 + 3] = progress * 3;
    }

    const positionNode = Fn(() => {
      // Buffers data
      const instancedPosition = instancedBufferAttribute<"vec3">(
        buffer,
        "vec3",
        0,
        0,
      );
      const instancedRotation = instancedBufferAttribute<"float">(
        buffer,
        "float",
        0,
        3,
      );

      // Wave
      const wave = time.add(positionLocal.y.mul(3)).sin().mul(0.25);
      positionLocal.z.addAssign(wave);

      // Rotation
      positionLocal.xz.assign(rotate(positionLocal.xz, instancedRotation));
      normalLocal.xz.assign(rotate(normalLocal.xz, instancedRotation));

      // Translation
      positionLocal.addAssign(instancedPosition);

      return positionLocal;
    })();

    return {
      positionNode,
    };
  }, []);

  return (
    <group {...props}>
      <mesh count={count} position-y={1} castShadow receiveShadow>
        <boxGeometry args={[0.5, 1, 0.5, 12, 12, 12]} />
        <meshStandardNodeMaterial {...nodes} />
      </mesh>
    </group>
  );
}

// Instanced Buffer Attribute and Full Matrices
function Method_6(props: ThreeElements["group"]) {
  const count = 5;

  // Shader
  const nodes = useMemo(() => {
    // Buffers creation
    const matricesArray = new Float32Array(count * 16);
    const matricesBuffer = new InstancedBufferAttribute(matricesArray, 16);

    // Buffers fill
    const position = new Vector3();
    const rotation = new Quaternion();
    const euler = new Euler();
    const scale = new Vector3(1, 1, 1);
    const matrix = new Matrix4();
    for (let i = 0; i < count; i++) {
      const progress = i / (count - 1);
      position.set((progress - 0.5) * 4, 0, 0);
      euler.set(0, progress * 3, 0);
      rotation.setFromEuler(euler);
      matrix.compose(position, rotation, scale);
      matrix.toArray(matricesArray, i * 16);
    }

    const positionNode = Fn(() => {
      // Wave
      const wave = time.add(positionLocal.y.mul(3)).sin().mul(0.25);
      positionLocal.z.addAssign(wave);

      // Instance transform
      instance(matricesBuffer);

      return positionLocal;
    })();

    return {
      positionNode,
    };
  }, []);

  return (
    <group {...props}>
      <mesh count={count} position-y={1} castShadow receiveShadow>
        <boxGeometry args={[0.5, 1, 0.5, 12, 12, 12]} />
        <meshStandardNodeMaterial {...nodes} />
      </mesh>
    </group>
  );
}

// Uniform Array
function Method_7(props: ThreeElements["group"]) {
  const count = 5;

  // Shader
  const nodes = useMemo(() => {
    const positionsArray: Vector3[] = [];
    const rotationsArray: number[] = [];

    for (let i = 0; i < count; i++) {
      const progress = i / (count - 1);

      const position = new Vector3();
      position.set((progress - 0.5) * 4, 0, 0);
      const rotation = progress * 3;

      positionsArray.push(position);
      rotationsArray.push(rotation);
    }

    // Uniform arrays
    const positions = uniformArray<"vec3">(positionsArray, "vec3");
    const rotations = uniformArray<"float">(rotationsArray, "float");

    const positionNode = Fn(() => {
      // Buffers
      const instancedPosition = positions.element(instanceIndex);
      const instancedRotation = rotations.element(instanceIndex);

      // Wave
      const wave = time.add(positionLocal.y.mul(3)).sin().mul(0.25);
      positionLocal.z.addAssign(wave);

      // Rotation
      positionLocal.xz.assign(rotate(positionLocal.xz, instancedRotation));
      normalLocal.xz.assign(rotate(normalLocal.xz, instancedRotation));

      // Translation
      positionLocal.addAssign(instancedPosition);

      return positionLocal;
    })();

    return {
      positionNode,
    };
  }, []);

  return (
    <group {...props}>
      <mesh count={count} position-y={1} castShadow receiveShadow>
        <boxGeometry args={[0.5, 1, 0.5, 12, 12, 12]} />
        <meshStandardNodeMaterial {...nodes} />
      </mesh>
    </group>
  );
}

// Storage and compute
function Method_8(props: ThreeElements["group"]) {
  const count = 5;

  // Buffers
  const { positionStorage } = useBuffers(
    () => ({
      positionStorage: instancedArray(count, "vec3"),
    }),
    "method_8_compute",
  );

  // Shader
  const { nodes, updateCompute } = useMemo(() => {
    // Compute
    const update = Fn(() => {
      const progress = instanceIndex.toFloat().div(count - 1);
      const position = positionStorage.element(instanceIndex);

      position.x.assign(progress.sub(0.5).mul(4));
      position.y.assign(time.add(progress).sin().add(0.55));
    })();
    const updateCompute = update.compute(count);

    // Position
    const positionNode = Fn(() => {
      const instancePosition = positionStorage.element(instanceIndex);
      positionLocal.addAssign(instancePosition);

      return positionLocal;
    })();

    return {
      nodes: { positionNode },
      updateCompute,
    };
  }, [count, positionStorage]);

  useFrame(({ renderer }) => renderer.compute(updateCompute));

  return (
    <group {...props}>
      <mesh count={count} position-y={1} castShadow receiveShadow>
        <boxGeometry args={[0.5, 1, 0.5, 12, 12, 12]} />
        <meshStandardNodeMaterial {...nodes} />
      </mesh>
    </group>
  );
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

  return (
    <mesh rotation-x={-Math.PI / 2} renderOrder={-1} receiveShadow {...props}>
      <planeGeometry args={[10, 10, 1, 1]} />
      <meshStandardNodeMaterial transparent map={diffuseTexture} {...nodes} />
    </mesh>
  );
}

// oxlint-disable react/purity
import {
  useTexture,
  useThree,
  useUniforms,
  type ThreeElements,
} from "@react-three/fiber/webgpu";
import { useLayoutEffect, useMemo } from "react";
import {
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  InstancedBufferAttribute,
  type Mesh,
  Sphere,
  SRGBColorSpace,
  StorageTexture,
  Vector3,
  Texture,
  RepeatWrapping,
} from "three/webgpu";
import { useAnvilGLB } from "../hooks/use-anvil-glb";
import {
  cameraFar,
  cameraNear,
  float,
  Fn,
  If,
  instancedBufferAttribute,
  instanceIndex,
  linearDepth,
  mul,
  packNormalToRGB,
  positionGeometry,
  range,
  rotate,
  texture,
  textureStore,
  time,
  transformNormalToView,
  TWO_PI,
  unpackRGBToNormal,
  uv,
  uvec2,
  vec2,
  vec3,
  vec4,
  vertexIndex,
  viewportLinearDepth,
  viewportSharedTexture,
} from "three/tsl";
import { folder, useDebugControls } from "../debug/use-debug-controls";
import { hashBlur } from "three/examples/jsm/tsl/display/hashBlur.js";

export default function StylizedNatureSceneLesson(
  props: ThreeElements["group"],
) {
  return (
    <group scale={0.7} {...props}>
      <Terrain />
      <Anvil position={[-3, 1, 2.8]} />
    </group>
  );
}

function Terrain(props: ThreeElements["mesh"]) {
  const terrainSize = 10;
  const renderer = useThree((s) => s.renderer);

  // Assets load
  const colorTexture = useTexture("/textures/grass.webp", (tex) => {
    tex.colorSpace = SRGBColorSpace;
  });
  const dataTexture = useTexture("/textures/floor-data.png");

  // Shader
  const { nodes, computeNodes, normalTexture } = useMemo(() => {
    // Compute normal
    const resolution = 32;
    const normalTexture = new StorageTexture(resolution, resolution); // Not compatible with WebGL
    const computeNormal = Fn(() => {
      // UV
      const indexUv = uvec2(
        instanceIndex.mod(resolution),
        instanceIndex.div(resolution),
      );
      const textureUv = indexUv.toVec2().div(resolution);

      // Normal calculation
      const texelSize = float(1).div(resolution);
      const xPos = texture(dataTexture, textureUv.add(vec2(texelSize, 0))).r;
      const xNeg = texture(dataTexture, textureUv.sub(vec2(texelSize, 0))).r;
      const yPos = texture(dataTexture, textureUv.add(vec2(0, texelSize))).r;
      const yNeg = texture(dataTexture, textureUv.sub(vec2(0, texelSize))).r;
      const xDelta = xNeg.sub(xPos);
      const yDelta = yNeg.sub(yPos);
      const normal = vec3(xDelta, yDelta, 1).normalize();

      // Store
      textureStore(
        normalTexture,
        indexUv,
        vec4(packNormalToRGB(normal), 1),
      ).toWriteOnly();
    })().compute(resolution * resolution);

    return {
      nodes: {},
      computeNodes: { computeNormal },
      normalTexture,
    };
  }, [dataTexture]);

  useLayoutEffect(() => {
    renderer.compute(computeNodes.computeNormal);
  }, [renderer, computeNodes]);

  return (
    <group>
      {/* Terrain */}
      <mesh
        rotation-x={-Math.PI / 2}
        castShadow={true}
        receiveShadow={true}
        {...props}
      >
        <planeGeometry args={[terrainSize, terrainSize, 20, 20]} />
        <meshStandardNodeMaterial
          map={colorTexture}
          normalMap={normalTexture}
          displacementMap={dataTexture}
          side={DoubleSide}
          {...nodes}
        />
      </mesh>

      {/* Grass */}
      <Grass
        terrainSize={terrainSize}
        elevationMap={dataTexture}
        terrainColorTexture={colorTexture}
        terrainNormalTexture={normalTexture}
      />

      {/* Water */}
      <Water elevationMap={dataTexture} />
    </group>
  );
}

type TextureChannel = "r" | "g" | "b" | "a";

type GrassProps = {
  terrainSize: number;
  edgesOffset?: number;
  terrainColorTexture: Texture;
  terrainNormalTexture: Texture;
  elevationMap: Texture;
  elevationMapChannel?: TextureChannel;
  scaleMap?: Texture;
  scaleMapChannel?: TextureChannel;
};

function Grass({
  terrainSize,
  edgesOffset = 0.25,
  terrainColorTexture,
  terrainNormalTexture,
  elevationMap,
  elevationMapChannel = "r",
  scaleMap,
  scaleMapChannel = "g",
}: GrassProps) {
  // Config
  const subdivisions = 100;
  const count = subdivisions * subdivisions;
  const size = terrainSize - edgesOffset;
  const halfSize = size / 2;
  const cellSize = size / (subdivisions - 1);

  // Assets load
  const noiseTexture = useTexture(
    "/textures/simplex-tiling-noise.png",
    (tex) => {
      tex.wrapS = RepeatWrapping;
      tex.wrapT = RepeatWrapping;
    },
  );

  // Triangle geometry
  const geometry = useMemo(() => {
    const vertexPositions = new Float32Array(3 * 2);
    // Vertex 0
    vertexPositions[0] = 0.25;
    vertexPositions[1] = 0;

    // Vertex 1
    vertexPositions[2] = -0.25;
    vertexPositions[3] = 0;

    // Vertex 2 (Tip)
    vertexPositions[4] = 0;
    vertexPositions[5] = 1;
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      "position",
      new Float32BufferAttribute(vertexPositions, 2),
    );
    geometry.boundingSphere = new Sphere(
      new Vector3(),
      Math.hypot(halfSize, halfSize),
    );
    return geometry;
  }, [halfSize]);

  // Uniforms
  const {
    height,
    wiggleSpeed,
    wiggleAmplitude,
    windSpeed,
    windFrequency,
    bendAmplitude,
    cullThreshold,
  } = useUniforms(
    {
      height: 0.4,
      wiggleSpeed: 6,
      wiggleAmplitude: 0.06,
      windSpeed: 0.08,
      windFrequency: 0.4,
      bendAmplitude: 0.1,
      cullThreshold: 0.1,
    },
    "stylized-natuer-scene-lesson-grass",
  );

  // Shader
  const { nodes } = useMemo(() => {
    // Buffers
    const instancePositionsArray = new Float32Array(count * 2);
    for (let iX = 0; iX < subdivisions; iX++) {
      for (let iZ = 0; iZ < subdivisions; iZ++) {
        const i = iX * subdivisions + iZ;
        instancePositionsArray[i * 2 + 0] =
          iX * cellSize - halfSize + (Math.random() - 0.5) * cellSize;
        instancePositionsArray[i * 2 + 1] =
          iZ * cellSize - halfSize + (Math.random() - 0.5) * cellSize;
      }
    }
    const instancePositions = new InstancedBufferAttribute(
      instancePositionsArray,
      2,
    );

    // Vayings
    const colorVarying = vec3().toVarying();
    const normalVarying = vec3().toVarying();

    // Position
    const positionNode = Fn(() => {
      const position = vec3(positionGeometry.xy, 0);
      const instancePosition = instancedBufferAttribute<"vec2">(
        instancePositions,
        "vec2",
      );

      // Tip
      const tip = vertexIndex.toFloat().step(2); // 2: Tip vertex

      // UV
      const terrainUv = instancePosition.div(terrainSize).add(0.5);
      terrainUv.y.assign(terrainUv.y.oneMinus());

      // Data textures
      const elevationTexture = texture(elevationMap, terrainUv);
      let scaleTexture;
      if (scaleMap !== undefined) {
        if (scaleMap === elevationMap) {
          scaleTexture = elevationTexture;
        } else {
          scaleTexture = texture(scaleMap, terrainUv);
        }
      } else {
        scaleTexture = elevationTexture;
      }
      const elevationFactor = elevationTexture[elevationMapChannel];
      const scaleFactor = scaleTexture[scaleMapChannel].remapClamp(0, 0.2);

      // Rotation
      const angle = range(float(0), TWO_PI);
      position.xz.assign(rotate(position.xz, angle));

      // Scale
      const scale = height.mul(range(0.7, 1)).mul(scaleFactor);
      position.mulAssign(scale);

      // Translate
      position.xz.addAssign(instancePosition);
      position.y.addAssign(elevationFactor);

      // Wind
      const wind = texture(
        noiseTexture,
        terrainUv.mul(windFrequency).add(time.mul(windSpeed)),
      ).r;

      // Wiggle
      const wiggleTime = time.add(instanceIndex).mul(wiggleSpeed);
      const wiggle = mul(
        wiggleTime.sin(),
        wiggleAmplitude,
        tip,
        elevationFactor,
        scaleFactor,
        wind,
      );
      position.x.addAssign(wiggle);

      // Bend
      const bend = wind
        .remapClamp(
          0,
          1,
          float(0).sub(bendAmplitude),
          float(0).add(bendAmplitude),
        )
        .mul(tip)
        .mul(scaleFactor);
      position.x.addAssign(bend);

      // Color
      colorVarying.assign(texture(terrainColorTexture, terrainUv).rgb);

      // Normal
      const normal = unpackRGBToNormal(
        texture(terrainNormalTexture, terrainUv).rgb,
      );
      normalVarying.assign(vec3(normal.x, normal.z, normal.y.negate()));

      // Degenerate triangles (Fragment shader optimization)
      const visible = scale.step(cullThreshold);
      position.mulAssign(visible);

      return position;
    })();

    // Color
    const colorNode = colorVarying;

    // Normal
    const normalNode = transformNormalToView(normalVarying);

    return { nodes: { positionNode, colorNode, normalNode } };
  }, [
    count,
    terrainSize,
    halfSize,
    cellSize,
    elevationMap,
    elevationMapChannel,
    scaleMap,
    scaleMapChannel,
    height,
    wiggleSpeed,
    wiggleAmplitude,
    noiseTexture,
    windSpeed,
    windFrequency,
    bendAmplitude,
    terrainColorTexture,
    terrainNormalTexture,
    cullThreshold,
  ]);

  // Debug
  useDebugControls("🏞️ Stylized Nature Scene", {
    Grass: folder({
      Height: { target: height, min: 0, max: 1, step: 0.001 },
      "Wiggle Speed": { target: wiggleSpeed, min: 0, max: 20, step: 0.001 },
      "Wiggle Amplitude": {
        target: wiggleAmplitude,
        min: 0,
        max: 0.5,
        step: 0.001,
      },
      "Wind Speed": { target: windSpeed, min: 0, max: 1, step: 0.001 },
      "Wind Frequency": { target: windFrequency, min: 0, max: 2, step: 0.001 },
      "Bend Amplitude": { target: bendAmplitude, min: 0, max: 1, step: 0.001 },
      "Cull Threshold": { target: cullThreshold, min: 0, max: 1, step: 0.001 },
    }),
  });

  return (
    <mesh
      count={count}
      castShadow={true}
      receiveShadow={true}
      geometry={geometry}
    >
      <meshStandardNodeMaterial side={DoubleSide} {...nodes} />
    </mesh>
  );
}

type WaterProps = {
  elevationMap: Texture;
  elevationMapChannel?: TextureChannel;
};

function Water({ elevationMap, elevationMapChannel = "r" }: WaterProps) {
  const elevation = 0.65;

  // Assets load
  const noiseTexture = useTexture(
    "/textures/simplex-tiling-noise.png",
    (tex) => {
      tex.wrapS = RepeatWrapping;
      tex.wrapT = RepeatWrapping;
    },
  );

  // Uniforms
  const {
    blurStrength,
    blurRepeats,
    colorAbsorption,
    shoreNoiseFrequency,
    shoreAnimationSpeed,
  } = useUniforms(
    {
      blurStrength: 0.02,
      blurRepeats: 25,
      colorAbsorption: new Vector3(0.45, 0.07, 0.01),
      shoreNoiseFrequency: 2,
      shoreAnimationSpeed: 1,
    },
    "stylized-natuer-scene-lesson-water",
  );

  // Shader
  const { nodes } = useMemo(() => {
    // Color
    const backdropNode = Fn(() => {
      // Depth effect
      const waterDepth = viewportLinearDepth
        .sub(linearDepth())
        .mul(cameraFar.sub(cameraNear))
        .max(0);

      If(waterDepth.greaterThan(20), () => {
        waterDepth.assign(1);
      });

      const color = hashBlur(
        viewportSharedTexture(),
        waterDepth.mul(blurStrength),
        {
          repeats: blurRepeats,
        },
      );

      // Color absorption
      const transmittance = colorAbsorption
        .negate()
        .mul(waterDepth)
        .mul(7)
        .exp();
      color.mulAssign(transmittance);

      return color;
    })();

    // Shore
    const backdropAlphaNode = Fn(() => {
      // Terrain data
      const terrainElevation = texture(elevationMap)[elevationMapChannel];
      terrainElevation.greaterThan(elevation + 0.05).discard();

      // Waves
      const wavesPattern1 = texture(
        noiseTexture,
        uv()
          .mul(shoreNoiseFrequency)
          .add(time.mul(float(-0.02).mul(shoreAnimationSpeed))),
      ).g;
      const wavesPattern2 = texture(
        noiseTexture,
        uv()
          .mul(shoreNoiseFrequency)
          .add(time.mul(float(0.03).mul(shoreAnimationSpeed))),
      ).b;
      const wavesPattern = wavesPattern1.add(wavesPattern2).div(2);

      // Shore factor
      const landProximity = terrainElevation.remap(0, elevation);
      const shore = landProximity.step(wavesPattern);

      return shore.oneMinus();
    })();

    return { nodes: { backdropNode, backdropAlphaNode } };
  }, [
    blurStrength,
    blurRepeats,
    colorAbsorption,
    noiseTexture,
    shoreNoiseFrequency,
    shoreAnimationSpeed,
    elevationMap,
    elevationMapChannel,
  ]);

  // Debug
  useDebugControls("🏞️ Stylized Nature Scene", {
    Water: folder({
      "Color Absorption": {
        target: colorAbsorption,
        min: 0,
        max: 1,
        step: 0.001,
        labels: { x: "Red", y: "Green", z: "Blue" },
        collapsed: true,
      },
      "Blur Strength": { target: blurStrength, min: 0, max: 0.2, step: 0.001 },
      "Blur Repeats": { target: blurRepeats, min: 1, max: 100, step: 1 },
      "Shore Noise Frequency": {
        target: shoreNoiseFrequency,
        min: 0,
        max: 15,
        step: 0.001,
      },
      "Shore Animation Speed": {
        target: shoreAnimationSpeed,
        min: 0,
        max: 5,
        step: 0.001,
      },
    }),
  });

  return (
    <mesh rotation-x={-Math.PI / 2} position-y={elevation} receiveShadow={true}>
      <planeGeometry args={[10, 10]} />
      <meshStandardNodeMaterial transparent={true} {...nodes} />
    </mesh>
  );
}

function Anvil(props: ThreeElements["object3D"]) {
  const { scene } = useAnvilGLB();

  useLayoutEffect(() => {
    scene.traverse((child) => {
      const mesh = child as Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }, [scene]);

  return <primitive {...props} object={scene} />;
}

import { useRenderPipeline } from "@react-three/fiber/webgpu";
import { bloom } from "three/examples/jsm/tsl/display/BloomNode.js";
import { fxaa } from "three/examples/jsm/tsl/display/FXAANode.js";
import {
  convertToTexture,
  mrt,
  normalWorld,
  output,
  renderOutput,
  texture,
  time,
  uv,
  vec2,
} from "three/tsl";
import { folder, useDebugControls } from "../debug/use-debug-controls";
import { chromaticAberration } from "three/examples/jsm/tsl/display/ChromaticAberrationNode.js";
import { pixelationPass } from "three/examples/jsm/tsl/display/PixelationPassNode.js";
import { sobel } from "three/examples/jsm/tsl/display/SobelOperatorNode.js";
import type { Node } from "three/webgpu";
import { shatter } from "../nodes/shatter-node";

/** Helper to explicitly type nodes as vec4 after verifying their internal output.*/
const toVec4 = (node: unknown) => node as Node<"vec4">;

export default function Effects() {
  // Controls
  const {
    FXAA,
    Bloom,
    ChromaticAberration,
    Pixelation,
    Sobel,
    Drunkenness,
    Shatter,
  } = useDebugControls("✨ Post-Processing", {
    FXAA: folder(
      "FXAA",
      {
        active: {
          name: "Active",
          value: true,
          uniform: false,
          onChange: () => rebuild(),
        },
      },
      { collapsed: true },
    ),
    Bloom: folder(
      "Bloom",
      {
        active: {
          name: "Active",
          value: true,
          uniform: false,
          onChange: () => rebuild(),
        },
        strength: {
          name: "Strength",
          value: 1,
          min: 0.01,
          max: 10,
          step: 0.01,
        },
        radius: {
          name: "Radius",
          value: 0,
          min: 0,
          max: 1,
          step: 0.001,
        },
        threshold: {
          name: "Threshold",
          value: 0.25,
          min: 0,
          max: 4,
          step: 0.001,
        },
      },
      { collapsed: true },
    ),
    ChromaticAberration: folder(
      "Chromatic Aberration",
      {
        active: {
          name: "Active",
          value: false,
          uniform: false,
          onChange: () => rebuild(),
        },
        strength: {
          name: "Strength",
          value: 2,
          min: 0.01,
          max: 10,
          step: 0.01,
        },
        center: {
          name: "Center Coordinates",
          value: { x: 0.5, y: 0.5 },
          labels: { x: "X", y: "Y" },
          min: 0,
          max: 1,
          collapsed: true,
        },
        scale: {
          name: "Scale",
          value: 1,
          min: 0.01,
          max: 4,
          step: 0.01,
        },
      },
      { collapsed: true },
    ),
    Pixelation: folder(
      "Pixelation",
      {
        active: {
          name: "Active",
          value: false,
          uniform: false,
          onChange: () => rebuild(),
        },
        pixelSize: {
          name: "Pixel Size",
          value: 12,
          min: 0.01,
          max: 25,
          step: 0.01,
        },
        normalEdgeStrength: {
          name: "Normal Edge Strength",
          value: 2,
          min: 0.01,
          max: 10,
          step: 0.01,
        },
        depthEdgeStrength: {
          name: "Depth Edge Strength",
          value: 1,
          min: 0.01,
          max: 10,
          step: 0.01,
        },
      },
      { collapsed: true },
    ),
    Sobel: folder(
      "Sobel",
      {
        active: {
          name: "Active",
          value: false,
          uniform: false,
          onChange: () => rebuild(),
        },
        edgeMin: {
          name: "Edge Min",
          value: 0.2,
          min: 0,
          max: 1,
          step: 0.01,
        },
        edgeMax: {
          name: "Edge Max",
          value: 1,
          min: 0,
          max: 1,
          step: 0.01,
        },
      },
      { collapsed: true },
    ),
    Drunkenness: folder(
      "Drunkenness",
      {
        active: {
          name: "Active",
          value: false,
          uniform: false,
          onChange: () => rebuild(),
        },
        tintColor: {
          name: "Color",
          value: "#5cf0a3",
        },
        waveSpeed: {
          name: "Wave Speed",
          value: 0.2,
          min: 0,
          max: 2,
          step: 0.001,
        },
        waveFrequency: {
          name: "Wave Frequency",
          value: 7,
          min: 0,
          max: 15,
          step: 0.01,
        },
        waveAmplitude: {
          name: "Wave Amplitude",
          value: 0.1,
          min: 0,
          max: 1,
          step: 0.001,
        },
      },
      { collapsed: true },
    ),
    Shatter: folder(
      "Shatter",
      {
        active: {
          name: "Active",
          value: false,
          uniform: false,
          onChange: () => rebuild(),
        },
        crackColor: {
          name: "Color",
          value: "#db784c",
        },
        crackColorStrength: {
          name: "Color Strength",
          value: 3,
          min: 0,
          max: 15,
          step: 0.01,
        },
        progress: {
          name: "Progress",
          value: 1,
          min: 0,
          max: 1,
          step: 0.01,
        },
        subdivision: {
          name: "Subdivisions",
          value: 3,
          min: 1,
          max: 12,
        },
        seed: {
          name: "Seed",
          value: 18,
          min: 0,
          max: 100,
          step: 1,
        },
        thickness: {
          name: "Thickness",
          value: 0.02,
          min: 0,
          max: 0.05,
          step: 0.0001,
        },
        offsetStrength: {
          name: "Offset Strength",
          value: 0.02,
          min: 0,
          max: 0.1,
          step: 0.0001,
        },
      },
      { collapsed: true },
    ),
  });

  // Main pipeline
  const { rebuild } = useRenderPipeline(
    ({ renderPipeline, passes, scene, camera }) => {
      // Disable automatic color transform
      renderPipeline.outputColorTransform = false;

      let current: Node<"vec4">;
      current = passes.scenePass.getTextureNode("output");

      // Pixelation
      if (Pixelation.active.value) {
        current = pixelationPass(
          scene,
          camera,
          Pixelation.pixelSize,
          Pixelation.normalEdgeStrength,
          Pixelation.depthEdgeStrength,
        );
      }

      // Shatter
      if (Shatter.active.value) {
        current = shatter(
          current,
          Shatter.progress,
          Shatter.crackColor,
          Shatter.crackColorStrength,
          Shatter.subdivision,
          Shatter.seed.toInt(),
          Shatter.thickness,
          Shatter.offsetStrength,
        );
      }

      // Bloom
      if (Bloom.active.value) {
        current = current.add(
          bloom(current, Bloom.strength, Bloom.radius, Bloom.threshold),
        );
      }

      // Chromatic aberration
      if (ChromaticAberration.active.value) {
        current = toVec4(
          chromaticAberration(
            current,
            ChromaticAberration.strength,
            ChromaticAberration.center,
            ChromaticAberration.scale,
          ),
        );
      }

      // Sobel
      if (Sobel.active.value) {
        const sobelPass = toVec4(
          sobel(passes.scenePass.getTextureNode("normal")),
        ).remapClamp(Sobel.edgeMin, Sobel.edgeMax, 0, 1);

        current = current.add(sobelPass);
      }

      // Drunkenness
      if (Drunkenness.active.value) {
        const currentTexture = convertToTexture(current);
        const wavedUv = vec2(
          uv().x,
          uv().y.add(
            uv()
              .x.add(time.mul(Drunkenness.waveSpeed))
              .mul(Drunkenness.waveFrequency)
              .sin()
              .mul(Drunkenness.waveAmplitude),
          ),
        );
        current = texture(currentTexture, wavedUv).mul(Drunkenness.tintColor);
      }

      // Manual color transform (encoding and tonemapping)
      current = renderOutput(current);

      // Antialiasing
      if (FXAA.active.value) {
        current = toVec4(fxaa(current));
      }

      // Final output
      renderPipeline.outputNode = current;
    },
    ({ passes }) => {
      passes.scenePass.setMRT(mrt({ output, normal: normalWorld }));
    },
  );

  return null;
}

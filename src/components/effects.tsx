import { useRenderPipeline, useUniforms } from "@react-three/fiber/webgpu";
import { chromaticAberration } from "three/examples/jsm/tsl/display/ChromaticAberrationNode.js";
import { bloom } from "three/examples/jsm/tsl/display/BloomNode.js";
import { fxaa } from "three/examples/jsm/tsl/display/FXAANode.js";
import { pixelationPass } from "three/examples/jsm/tsl/display/PixelationPassNode.js";
import { sobel } from "three/examples/jsm/tsl/display/SobelOperatorNode.js";
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
import type { Node } from "three/webgpu";
import { folder, useDebugControls } from "../debug/use-debug-controls";
import { shatter } from "../nodes/shatter-node";

/** Helper to explicitly type nodes as vec4 after verifying their internal output.*/
const toVec4 = (node: unknown) => node as Node<"vec4">;

export default function Effects() {
  // Uniforms
  const uniforms = usePostProcessingUniforms();

  // Main pipeline
  const { rebuild } = useRenderPipeline(
    ({ renderPipeline, passes, scene, camera }) => {
      const {
        fxaaActive,
        bloomActive,
        bloomStrength,
        bloomRadius,
        bloomThreshold,
        caActive,
        caStrength,
        caCenter,
        caScale,
        pixelActive,
        pixelSize,
        pixelNormalEdge,
        pixelDepthEdge,
        sobelActive,
        sobelEdgeMin,
        sobelEdgeMax,
        drunkActive,
        drunkColor,
        drunkWaveSpeed,
        drunkWaveFreq,
        drunkWaveAmp,
        shatterActive,
        shatterCrackColor,
        shatterColorStrength,
        shatterProgress,
        shatterSubdivision,
        shatterSeed,
        shatterThickness,
        shatterOffsetStrength,
      } = uniforms;

      // Disable automatic color transform
      renderPipeline.outputColorTransform = false;

      let current: Node<"vec4">;
      current = passes.scenePass.getTextureNode("output");

      // Pixelation
      if (pixelActive.value) {
        current = pixelationPass(
          scene,
          camera,
          pixelSize,
          pixelNormalEdge,
          pixelDepthEdge,
        );
      }

      // Shatter
      if (shatterActive.value) {
        current = shatter(
          current,
          shatterProgress,
          shatterCrackColor,
          shatterColorStrength,
          shatterSubdivision,
          shatterSeed.toInt(),
          shatterThickness,
          shatterOffsetStrength,
        );
      }

      // Bloom
      if (bloomActive.value) {
        current = current.add(
          bloom(current, bloomStrength, bloomRadius, bloomThreshold),
        );
      }

      // Chromatic aberration
      if (caActive.value) {
        current = toVec4(
          chromaticAberration(current, caStrength, caCenter, caScale),
        );
      }

      // Sobel
      if (sobelActive.value) {
        const sobelPass = toVec4(
          sobel(passes.scenePass.getTextureNode("normal")),
        ).remapClamp(sobelEdgeMin, sobelEdgeMax, 0, 1);

        current = current.add(sobelPass);
      }

      // Drunkenness
      if (drunkActive.value) {
        const currentTexture = convertToTexture(current);
        const wavedUv = vec2(
          uv().x,
          uv().y.add(
            uv()
              .x.add(time.mul(drunkWaveSpeed))
              .mul(drunkWaveFreq)
              .sin()
              .mul(drunkWaveAmp),
          ),
        );
        current = texture(currentTexture, wavedUv).mul(drunkColor);
      }

      // Manual color transform (encoding and tonemapping)
      current = renderOutput(current);

      // Antialiasing
      if (fxaaActive.value) {
        current = toVec4(fxaa(current));
      }

      // Final output
      renderPipeline.outputNode = current;
    },
    ({ passes }) => {
      passes.scenePass.setMRT(mrt({ output, normal: normalWorld }));
    },
  );

  usePostProcessingDebug(uniforms, rebuild);

  return null;
}

// Uniform nodes instantiation
function usePostProcessingUniforms() {
  return useUniforms(
    {
      fxaaActive: true,
      bloomActive: true,
      bloomStrength: 0.05,
      bloomRadius: 0,
      bloomThreshold: 0,
      caActive: false,
      caStrength: 2,
      caCenter: { x: 0.5, y: 0.5 },
      caScale: 1,
      pixelActive: false,
      pixelSize: 12,
      pixelNormalEdge: 2,
      pixelDepthEdge: 1,
      sobelActive: false,
      sobelEdgeMin: 0.2,
      sobelEdgeMax: 1,
      drunkActive: false,
      drunkColor: "#5cf0a3",
      drunkWaveSpeed: 0.2,
      drunkWaveFreq: 7,
      drunkWaveAmp: 0.1,
      shatterActive: false,
      shatterCrackColor: "#db784c",
      shatterColorStrength: 3,
      shatterProgress: 1,
      shatterSubdivision: 3,
      shatterSeed: 18,
      shatterThickness: 0.02,
      shatterOffsetStrength: 0.02,
    },
    "postprocessing",
  );
}

// Debug controls setup
function usePostProcessingDebug(
  uniforms: ReturnType<typeof usePostProcessingUniforms>,
  triggerRebuild: () => void,
) {
  const rebuild = () => triggerRebuild();

  useDebugControls(
    "✨ Post-Processing",
    {
      FXAA: folder(
        {
          Active: { target: uniforms.fxaaActive, onChange: rebuild },
        },
        { collapsed: true },
      ),

      Bloom: folder(
        {
          Active: { target: uniforms.bloomActive, onChange: rebuild },
          Strength: {
            target: uniforms.bloomStrength,
            min: 0.001,
            max: 3,
            step: 0.001,
          },
          Radius: { target: uniforms.bloomRadius, min: 0, max: 1, step: 0.001 },
          Threshold: {
            target: uniforms.bloomThreshold,
            min: 0,
            max: 4,
            step: 0.001,
          },
        },
        { collapsed: true },
      ),

      "Chromatic Aberration": folder(
        {
          Active: { target: uniforms.caActive, onChange: rebuild },
          Strength: {
            target: uniforms.caStrength,
            min: 0.01,
            max: 10,
            step: 0.01,
          },
          "Center Coordinates": {
            target: uniforms.caCenter,
            labels: { x: "X", y: "Y" },
            min: 0,
            max: 1,
            collapsed: true,
          },
          Scale: { target: uniforms.caScale, min: 0.01, max: 4, step: 0.01 },
        },
        { collapsed: true },
      ),

      Pixelation: folder(
        {
          Active: { target: uniforms.pixelActive, onChange: rebuild },
          "Pixel Size": {
            target: uniforms.pixelSize,
            min: 0.01,
            max: 25,
            step: 0.01,
          },
          "Normal Edge Strength": {
            target: uniforms.pixelNormalEdge,
            min: 0.01,
            max: 10,
            step: 0.01,
          },
          "Depth Edge Strength": {
            target: uniforms.pixelDepthEdge,
            min: 0.01,
            max: 10,
            step: 0.01,
          },
        },
        { collapsed: true },
      ),

      Sobel: folder(
        {
          Active: { target: uniforms.sobelActive, onChange: rebuild },
          "Edge Min": {
            target: uniforms.sobelEdgeMin,
            min: 0,
            max: 1,
            step: 0.01,
          },
          "Edge Max": {
            target: uniforms.sobelEdgeMax,
            min: 0,
            max: 1,
            step: 0.01,
          },
        },
        { collapsed: true },
      ),

      Drunkenness: folder(
        {
          Active: { target: uniforms.drunkActive, onChange: rebuild },
          Color: { target: uniforms.drunkColor },
          "Wave Speed": {
            target: uniforms.drunkWaveSpeed,
            min: 0,
            max: 2,
            step: 0.001,
          },
          "Wave Frequency": {
            target: uniforms.drunkWaveFreq,
            min: 0,
            max: 15,
            step: 0.01,
          },
          "Wave Amplitude": {
            target: uniforms.drunkWaveAmp,
            min: 0,
            max: 1,
            step: 0.001,
          },
        },
        { collapsed: true },
      ),

      Shatter: folder(
        {
          Active: { target: uniforms.shatterActive, onChange: rebuild },
          Color: { target: uniforms.shatterCrackColor },
          "Color Strength": {
            target: uniforms.shatterColorStrength,
            min: 0,
            max: 15,
            step: 0.01,
          },
          Progress: {
            target: uniforms.shatterProgress,
            min: 0,
            max: 1,
            step: 0.01,
          },
          Subdivisions: {
            target: uniforms.shatterSubdivision,
            min: 1,
            max: 12,
          },
          Seed: { target: uniforms.shatterSeed, min: 0, max: 100, step: 1 },
          Thickness: {
            target: uniforms.shatterThickness,
            min: 0,
            max: 0.05,
            step: 0.0001,
          },
          "Offset Strength": {
            target: uniforms.shatterOffsetStrength,
            min: 0,
            max: 0.1,
            step: 0.0001,
          },
        },
        { collapsed: true },
      ),
    },
    { collapsed: true },
  );
}

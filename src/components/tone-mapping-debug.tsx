// oxlint-disable react/immutability
import { useThree } from "@react-three/fiber/webgpu";
import { useDebugControls } from "../debug/use-debug-controls";
import {
  ACESFilmicToneMapping,
  AgXToneMapping,
  CineonToneMapping,
  LinearToneMapping,
  NeutralToneMapping,
  NoToneMapping,
  ReinhardToneMapping,
  type ToneMapping,
} from "three/webgpu";

export default function ToneMappingDebug() {
  const renderer = useThree((s) => s.renderer);

  useDebugControls(
    "🎥 Renderer",
    {
      toneMapping: {
        name: "Tone Mapping",
        value: renderer.toneMapping,
        options: {
          None: NoToneMapping,
          Linear: LinearToneMapping,
          Reinhard: ReinhardToneMapping,
          Cineon: CineonToneMapping,
          ACESFilmic: ACESFilmicToneMapping,
          AgX: AgXToneMapping,
          Neutral: NeutralToneMapping,
        },
        onChange: (v: ToneMapping) => (renderer.toneMapping = v),
      },
      toneMappingExposure: {
        name: "Tone Mapping Exposure",
        value: renderer.toneMappingExposure,
        min: 0,
        max: 3,
        step: 0.01,
        onChange: (v: number) => (renderer.toneMappingExposure = v),
      },
    },
    "renderer_tonemapping",
    { collapsed: true },
  );

  return null;
}

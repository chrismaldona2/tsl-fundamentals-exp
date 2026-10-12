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
} from "three/webgpu";

export default function RendererDebug() {
  const renderer = useThree((s) => s.renderer);

  useDebugControls(
    "🎥 Renderer",
    {
      "Tone Mapping": {
        target: renderer,
        property: "toneMapping",
        options: {
          None: NoToneMapping,
          Linear: LinearToneMapping,
          Reinhard: ReinhardToneMapping,
          Cineon: CineonToneMapping,
          ACESFilmic: ACESFilmicToneMapping,
          AgX: AgXToneMapping,
          Neutral: NeutralToneMapping,
        },
      },
      "Tone Mapping Exposure": {
        target: renderer,
        property: "toneMappingExposure",
        min: 0,
        max: 3,
        step: 0.01,
      },
    },
    { collapsed: true },
  );

  return null;
}

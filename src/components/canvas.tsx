import {
  Canvas as FiberCanvas,
  type WebGPUCanvasProps,
} from "@react-three/fiber/webgpu";
import { CineonToneMapping } from "three/webgpu";
import { getInspector } from "../debug/inspector";

export default function Canvas(props: WebGPUCanvasProps) {
  return (
    <FiberCanvas
      renderer={{
        antialias: false,
        forceWebGL: false,
        toneMapping: CineonToneMapping,
        toneMappingExposure: 1.3,
      }}
      onCreated={({ renderer }) => {
        renderer.inspector = getInspector();
      }}
      style={{
        width: "100vw",
        height: "100dvh",
        position: "fixed",
        outline: "none",
        top: 0,
        left: 0,
        userSelect: "none",
      }}
      shadows="percentage"
      camera={{ position: [10, 11, 7], fov: 35 }}
      background="#141414"
      dpr={[1, 2]}
      {...props}
    />
  );
}

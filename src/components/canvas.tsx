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
      }}
      shadows="percentage"
      camera={{ position: [10, 11, 7], fov: 35 }}
      background="#0f0f0f"
      dpr={[1, 2]}
      {...props}
    />
  );
}

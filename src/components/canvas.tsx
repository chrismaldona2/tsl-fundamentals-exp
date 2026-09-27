import {
  Canvas as FiberCanvas,
  type WebGPUCanvasProps,
} from "@react-three/fiber/webgpu";
import { NoToneMapping } from "three/webgpu";
import { getInspector } from "../debug/inspector";

export default function Canvas(props: WebGPUCanvasProps) {
  return (
    <FiberCanvas
      renderer={{
        antialias: true,
        forceWebGL: false,
        toneMapping: NoToneMapping,
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
      camera={{ position: [7, 8, 4], fov: 35 }}
      background="#0f0f0f"
      dpr={[1, 2]}
      {...props}
    />
  );
}

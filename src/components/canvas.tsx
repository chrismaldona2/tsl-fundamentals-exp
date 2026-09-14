import {
  Canvas as FiberCanvas,
  type WebGPUCanvasProps,
} from "@react-three/fiber/webgpu";
import { NoToneMapping } from "three/webgpu";

export default function Canvas(props: WebGPUCanvasProps) {
  return (
    <FiberCanvas
      renderer={{
        antialias: true,
        forceWebGL: false,
        toneMapping: NoToneMapping,
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
      camera={{ position: [5, 4.5, 2.5], fov: 35 }}
      background="#0f0f0f"
      dpr={[devicePixelRatio, 2]}
      {...props}
    />
  );
}

import { OrbitControls } from "@react-three/drei/webgpu";
import Canvas from "./components/canvas";
import Scene from "./components/scene";
import Effects from "./components/effects";
import ToneMappingDebug from "./components/tone-mapping-debug";

export default function App() {
  return (
    <Canvas>
      <ToneMappingDebug />
      <OrbitControls
        maxPolarAngle={Math.PI / 2}
        enablePan={false}
        makeDefault
      />
      <Scene />
      <Effects />
    </Canvas>
  );
}

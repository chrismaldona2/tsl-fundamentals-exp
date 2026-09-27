import { OrbitControls } from "@react-three/drei/webgpu";
import Canvas from "./components/canvas";
import Scene from "./components/scene";

export default function App() {
  return (
    <Canvas>
      <OrbitControls
        maxPolarAngle={Math.PI / 2}
        enablePan={false}
        makeDefault
      />
      <Scene />
    </Canvas>
  );
}

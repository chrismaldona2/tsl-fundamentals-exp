import { useEffect } from "react";
import { useThree } from "@react-three/fiber/webgpu";
import { OrbitControls } from "three/examples/jsm/Addons.js";
import { useNavigationStore } from "../stores/navigation-store";

export default function CameraRig() {
  const current = useNavigationStore((s) => s.current);
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls);

  useEffect(() => {
    const targetZ = current * -10;
    camera.position.z = 7 + targetZ;

    if (controls instanceof OrbitControls) {
      controls.target.set(0, 0, targetZ);
      controls.update();
    } else {
      camera.lookAt(0, 0, targetZ);
    }
  }, [current, camera, controls]);
  return null;
}

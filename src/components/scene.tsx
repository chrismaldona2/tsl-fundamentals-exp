import Lights from "./lights";
import CameraRig from "./camera-rig";
import GizmoManager from "./gizmo-manager";
import Zone from "./zone";
import { testRegistry } from "../tests/test-registry";

export default function Scene() {
  return (
    <>
      <Lights />
      <CameraRig />
      <GizmoManager />

      {testRegistry.map((test) => (
        <Zone key={test.id} id={test.id} position={test.position}>
          <test.component />
        </Zone>
      ))}
    </>
  );
}

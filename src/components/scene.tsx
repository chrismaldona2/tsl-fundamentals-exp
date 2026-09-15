import Lights from "./lights";
import CameraRig from "./camera-rig";
import NodeMaterialsTest from "../tests/01-node-materials";
import VariablesTest from "../tests/02-variables";
import GizmoManager from "./gizmo-manager";

export default function Scene() {
  return (
    <>
      <Lights />
      <CameraRig />
      <GizmoManager />
      <NodeMaterialsTest />
      <VariablesTest position-z={-10} />
    </>
  );
}

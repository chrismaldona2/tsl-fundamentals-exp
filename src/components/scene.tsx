import Lights from "./lights";
import CameraRig from "./camera-rig";
import NodeMaterialsTest from "../tests/01-node-materials";
import VariablesTest from "../tests/02-variables";
import GizmoManager from "./gizmo-manager";
import Zone from "./zone";
import type { Vector3Tuple } from "three/webgpu";

const TESTS: {
  id: string;
  content: React.ReactNode;
  position?: Vector3Tuple;
}[] = [
  {
    id: "01-node-materials",
    content: <NodeMaterialsTest />,
    position: [0, 0, 0],
  },
  {
    id: "02-variables",
    content: <VariablesTest />,
    position: [0, 0, -10],
  },
];

export default function Scene() {
  return (
    <>
      <Lights />
      <CameraRig />
      <GizmoManager />

      {TESTS.map((test) => (
        <Zone key={test.id} id={test.id} position={test.position}>
          {test.content}
        </Zone>
      ))}
    </>
  );
}

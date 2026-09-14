import Floor from "./floor";
import Lights from "./lights";
import TorusKnot from "./torus-knot";

export default function Scene() {
  return (
    <group>
      <Lights />
      <TorusKnot position-y={1} />
      <Floor />
    </group>
  );
}

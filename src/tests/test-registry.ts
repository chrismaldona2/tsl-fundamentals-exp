import type { Vector3Tuple } from "three/webgpu";
import type { ComponentType } from "react";
import NodeMaterialsTest from "./01-node-materials";
import VariablesAndReferencesTest from "./02-variables-and-references";
import MathTest from "./03-math";
import TexturesTest from "./04-textures";
import UniformsAndAttributesTest from "./05-uniforms-and-attributes";
import NodeFunctionsTest from "./06-node-functions";
import PatternsTest from "./07-patterns";
import CoffeeTest from "./08-coffee-smoke";

export const testRegistry: {
  id: string;
  component: ComponentType;
  position?: Vector3Tuple;
}[] = [
  {
    id: "01-node-materials",
    component: NodeMaterialsTest,
    position: [0, 0, 0],
  },
  {
    id: "02-variables-and-references",
    component: VariablesAndReferencesTest,
    position: [0, 0, -10],
  },
  {
    id: "03-math",
    component: MathTest,
    position: [0, 0, -20],
  },
  {
    id: "04-textures",
    component: TexturesTest,
    position: [0, 0, -30],
  },
  {
    id: "05-uniforms-and-attributes",
    component: UniformsAndAttributesTest,
    position: [0, 0, -40],
  },
  {
    id: "06-node-functions",
    component: NodeFunctionsTest,
    position: [0, 0, -50],
  },
  {
    id: "07-patterns",
    component: PatternsTest,
    position: [0, 0, -63],
  },
  {
    id: "08-coffee-smoke",
    component: CoffeeTest,
    position: [0, 0, -74],
  },
];

import { useGLTF } from "@react-three/drei";
import type { Mesh, MeshStandardMaterial } from "three";
import type { GLTF } from "three/examples/jsm/Addons.js";

// GLB Loader
type GLTFResult = GLTF & {
  nodes: {
    anvil: Mesh;
    hammer: Mesh;
    blade: Mesh;
  };
  materials: {
    ["Material.001"]: MeshStandardMaterial;
    color: MeshStandardMaterial;
    blade: MeshStandardMaterial;
  };
};

const anvilUrl = "/models/anvil.glb";

export function useAnvilGLB(): GLTFResult {
  return useGLTF(anvilUrl) as unknown as GLTFResult;
}
useGLTF.preload(anvilUrl);

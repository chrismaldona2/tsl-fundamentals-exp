import { uniform } from "three/tsl";
import { Vector2, Vector3, Vector4 } from "three";
import type { NormalizedNode } from "./types";

export function createNodes(
  tree: Record<string, NormalizedNode>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, node] of Object.entries(tree)) {
    // Recursively handle folders
    if (node.kind === "folder") {
      result[key] = createNodes(node.children);
      continue;
    }

    // Ignore buttons (they have no state value)
    if (node.kind === "button") {
      continue;
    }

    // Handle state primitive opt-outs
    if (!node.uniform || node.kind === "options" || node.kind === "string") {
      result[key] = { value: node.value };
      continue;
    }

    // TSL Uniform Generation
    switch (node.kind) {
      case "color":
        result[key] = uniform(node.value, "color");
        break;
      case "vector":
        if (node.value instanceof Vector2)
          result[key] = uniform(node.value, "vec2");
        else if (node.value instanceof Vector3)
          result[key] = uniform(node.value, "vec3");
        else if (node.value instanceof Vector4)
          result[key] = uniform(node.value, "vec4");
        break;
      case "boolean":
        result[key] = uniform(node.value, "bool");
        break;
      case "number":
        result[key] = uniform(node.value, "float");
        break;
    }
  }

  return result;
}

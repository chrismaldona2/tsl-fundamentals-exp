import { Color } from "three";
import type { DebugFolder } from "./inspector";
import type {
  NormalizedNode,
  NormalizedControl,
  AnyVectorOutput,
} from "./types";

type StateContainer<T> = { value: T };

export function renderTree(
  folder: DebugFolder,
  tree: Record<string, NormalizedNode>,
  nodesState: Record<string, unknown>,
) {
  for (const [key, node] of Object.entries(tree)) {
    if (node.kind === "folder") {
      const childFolder = folder.addFolder(node.name);
      if (node.collapsed) childFolder.close();

      const childState = (nodesState[key] || {}) as Record<string, unknown>;
      renderTree(childFolder, node.children, childState);
    } else {
      renderControl(folder, node, nodesState[key]);
    }
  }
}

function renderControl(
  folder: DebugFolder,
  control: NormalizedControl,
  nodeState: unknown,
) {
  if (
    typeof nodeState !== "object" ||
    nodeState === null ||
    !("value" in nodeState)
  )
    return;

  switch (control.kind) {
    case "number": {
      const state = nodeState as StateContainer<number>;
      const args = [control.min, control.max, control.step].filter(
        (v) => v !== undefined,
      );

      folder
        .add(state, "value", ...args)
        .name(control.name)
        .onChange((v: unknown) => {
          if (typeof v === "number") control.onChange?.(v);
        });
      break;
    }

    case "boolean": {
      const state = nodeState as StateContainer<boolean>;

      folder
        .add(state, "value")
        .name(control.name)
        .onChange((v: unknown) => {
          if (typeof v === "boolean") control.onChange?.(v);
        });
      break;
    }

    case "string": {
      const state = nodeState as StateContainer<string>;

      folder
        .add(state, "value")
        .name(control.name)
        .onChange((v: unknown) => {
          if (typeof v === "string") control.onChange?.(v);
        });
      break;
    }

    case "color": {
      const state = nodeState as StateContainer<Color | string | number>;

      folder
        .addColor(state, "value")
        .name(control.name)
        .onChange((v: unknown) => {
          if (v instanceof Color) {
            control.onChange?.(v);
          } else if (typeof v === "string" && v.startsWith("#")) {
            control.onChange?.(v as `#${string}`);
          } else if (typeof v === "number") {
            const hexString =
              `#${v.toString(16).padStart(6, "0")}` as `#${string}`;
            control.onChange?.(hexString);
          }
        });
      break;
    }

    case "vector": {
      const state = nodeState as StateContainer<AnyVectorOutput>;
      const vec = state.value;
      const vecFolder = folder.addFolder(control.name);

      if ("x" in vec)
        vecFolder.add(vec, "x").onChange(() => control.onChange?.(vec));
      if ("y" in vec)
        vecFolder.add(vec, "y").onChange(() => control.onChange?.(vec));
      if ("z" in vec)
        vecFolder.add(vec, "z").onChange(() => control.onChange?.(vec));
      if ("w" in vec)
        vecFolder.add(vec, "w").onChange(() => control.onChange?.(vec));
      break;
    }

    case "options": {
      const state = nodeState as StateContainer<string | number | boolean>;

      type ValidOptions =
        | string[]
        | number[]
        | Record<string, string | number | boolean>;
      const options = control.options as ValidOptions;

      folder
        .add(state, "value", options)
        .name(control.name)
        .onChange((v: unknown) => control.onChange?.(v));
      break;
    }

    case "button": {
      const proxy = { click: () => control.onClick() };
      folder.add(proxy, "click").name(control.name);
      break;
    }
  }
}

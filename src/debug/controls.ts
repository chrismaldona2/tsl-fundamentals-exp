import { Color } from "three";
import type { DebugFolder } from "./inspector";
import type {
  NormalizedNode,
  NormalizedControl,
  AnyVectorOutput,
  DebugSchema,
  OptionValue,
} from "./types";

/**
 * Attaches a normalized schema tree and its state objects to the Three.js Inspector.
 */
export function renderTree(
  folder: DebugFolder,
  tree: Record<string, NormalizedNode>,
  nodesState: Record<string, unknown>,
  schemaRef: { current: DebugSchema },
  path: string[] = [],
) {
  for (const [key, node] of Object.entries(tree)) {
    const currentPath = [...path, key];

    if (node.kind === "folder") {
      const childFolder = folder.addFolder(node.name);
      if (node.collapsed) childFolder.close();

      const childState = isObject(nodesState[key]) ? nodesState[key] : {};
      renderTree(
        childFolder,
        node.children,
        childState,
        schemaRef,
        currentPath,
      );
    } else {
      renderControl(folder, node, nodesState[key], schemaRef, currentPath);
    }
  }
}

/**
 * Adds an individual control to a Three.js Inspector folder and binds its state and callbacks.
 */
function renderControl(
  folder: DebugFolder,
  control: NormalizedControl,
  nodeState: unknown,
  schemaRef: { current: DebugSchema },
  path: string[],
) {
  if (control.kind === "button") {
    const proxy = {
      click: () => {
        const latestOnClick = resolveSchemaValue(schemaRef.current, path);
        if (typeof latestOnClick === "function") latestOnClick();
      },
    };
    folder.add(proxy, "click").name(control.name);
    return;
  }

  if (!isStateContainer(nodeState)) return;

  switch (control.kind) {
    case "number": {
      const state = nodeState as StateContainer<number>;

      let addedControl;
      if (control.step !== undefined) {
        addedControl = folder.add(
          state,
          "value",
          control.min ?? 0,
          control.max ?? 1,
          control.step,
        );
      } else if (control.max !== undefined) {
        addedControl = folder.add(
          state,
          "value",
          control.min ?? 0,
          control.max,
        );
      } else if (control.min !== undefined) {
        addedControl = folder.add(state, "value", control.min);
      } else {
        addedControl = folder.add(state, "value");
      }

      addedControl.name(control.name).onChange((v: unknown) => {
        if (typeof v === "number") getLatestOnChange(schemaRef, path)?.(v);
      });
      break;
    }

    case "boolean": {
      const state = nodeState as StateContainer<boolean>;

      folder
        .add(state, "value")
        .name(control.name)
        .onChange((v: unknown) => {
          if (typeof v === "boolean") getLatestOnChange(schemaRef, path)?.(v);
        });
      break;
    }

    case "string": {
      const state = nodeState as StateContainer<string>;

      folder
        .add(state, "value")
        .name(control.name)
        .onChange((v: unknown) => {
          if (typeof v === "string") getLatestOnChange(schemaRef, path)?.(v);
        });
      break;
    }

    case "color": {
      const state = nodeState as StateContainer<Color | string | number>;

      folder
        .addColor(state, "value")
        .name(control.name)
        .onChange((v: unknown) => {
          const onChange = getLatestOnChange(schemaRef, path);
          if (!onChange) return;

          if (v instanceof Color) {
            onChange(v);
          } else if (typeof v === "string" && v.startsWith("#")) {
            onChange(v as `#${string}`);
          } else if (typeof v === "number") {
            const hexString =
              `#${v.toString(16).padStart(6, "0")}` as `#${string}`;
            onChange(hexString);
          }
        });
      break;
    }

    case "vector": {
      const state = nodeState as StateContainer<AnyVectorOutput>;
      const vec = state.value;
      const vecFolder = folder.addFolder(control.name);

      const triggerChange = () => getLatestOnChange(schemaRef, path)?.(vec);

      if ("x" in vec) vecFolder.add(vec, "x").onChange(triggerChange);
      if ("y" in vec) vecFolder.add(vec, "y").onChange(triggerChange);
      if ("z" in vec) vecFolder.add(vec, "z").onChange(triggerChange);
      if ("w" in vec) vecFolder.add(vec, "w").onChange(triggerChange);
      break;
    }

    case "options": {
      const state = nodeState as StateContainer<OptionValue>;

      folder
        .add(state, "value", control.options)
        .name(control.name)
        .onChange((v: unknown) => getLatestOnChange(schemaRef, path)?.(v));
      break;
    }
  }
}

// Helpers
type StateContainer<T> = { value: T };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStateContainer(value: unknown): value is StateContainer<unknown> {
  return isObject(value) && "value" in value;
}

function hasOnChange(
  value: unknown,
): value is { onChange?: (value: unknown) => void } {
  return isObject(value) && "onChange" in value;
}

function resolveSchemaValue(schema: DebugSchema, path: string[]): unknown {
  let current: unknown = schema;
  for (const key of path) {
    if (!isObject(current)) return undefined;

    if ("isFolderWrapper" in current) {
      const folderSchema = current.schema;
      if (!isObject(folderSchema)) return undefined;
      current = folderSchema[key];
    } else {
      current = current[key];
    }
  }
  return current;
}

function getLatestOnChange(
  schemaRef: { current: DebugSchema },
  path: string[],
) {
  const value = resolveSchemaValue(schemaRef.current, path);
  return hasOnChange(value) ? value.onChange : undefined;
}

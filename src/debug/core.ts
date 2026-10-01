import { Color, Vector2, Vector3, Vector4 } from "three";
import type {
  DebugSchema,
  FolderWrapper,
  ButtonControl,
  ControlConfig,
  NumberControl,
  OptionsControl,
  NormalizedNode,
  PlainVector,
  AnyVectorOutput,
  OptionValue,
} from "./types";
import { uniform } from "three/tsl";

/**
 * Converts a debug schema into a normalized internal format used to build the Three.js Inspector controls.
 */
export function normalizeSchema(
  schema: DebugSchema,
): Record<string, NormalizedNode> {
  const tree: Record<string, NormalizedNode> = {};

  for (const [key, value] of Object.entries(schema)) {
    tree[key] = normalizeNode(key, value);
  }

  return tree;
}

/**
 * Maps a single schema property to a strictly typed control definition.
 */
function normalizeNode(key: string, value: unknown): NormalizedNode {
  if (isFolderWrapper(value)) {
    return {
      kind: "folder",
      name: value.name,
      collapsed: value.options?.collapsed ?? false,
      children: normalizeSchema(value.schema),
    };
  }

  if (isNestedSchema(value)) {
    return {
      kind: "folder",
      name: key,
      collapsed: false,
      children: normalizeSchema(value),
    };
  }

  if (isButton(value)) {
    return { kind: "button", name: key };
  }

  // Extract base payload and metadata
  const isConfig = isControlConfig(value);
  const raw = isConfig ? value.value : value;
  const name = isConfig && value.name ? value.name : key;
  const uniform = isConfig ? value.uniform !== false : true;
  const base = { name, uniform };

  // Map values
  if (typeof raw === "number") {
    const config = isNumberConfig(value) ? value : undefined;
    return {
      kind: "number",
      value: raw,
      min: config?.min,
      max: config?.max,
      step: config?.step,
      ...base,
    };
  }

  if (typeof raw === "boolean") {
    return { kind: "boolean", value: raw, ...base };
  }

  if (typeof raw === "string" && !isColor(raw)) {
    return { kind: "string", value: raw, ...base };
  }

  if (isColor(raw)) {
    return {
      kind: "color",
      value: typeof raw === "string" ? new Color(raw) : raw,
      ...base,
    };
  }

  if (isThreeVector(raw) || isPlainVector(raw)) {
    let vecValue: AnyVectorOutput;

    if (isThreeVector(raw)) {
      vecValue = raw;
    } else {
      if (typeof raw.w === "number" && typeof raw.z === "number") {
        vecValue = new Vector4(raw.x, raw.y, raw.z, raw.w);
      } else if (typeof raw.z === "number") {
        vecValue = new Vector3(raw.x, raw.y, raw.z);
      } else {
        vecValue = new Vector2(raw.x, raw.y);
      }
    }

    return { kind: "vector", value: vecValue, ...base };
  }

  if (isOptionsConfig(value)) {
    return {
      kind: "options",
      value: value.value,
      options: value.options,
      ...base,
    };
  }

  throw new Error(
    `[Debug Controls] Unsupported schema value for key: "${key}"`,
  );
}

/**
 * Generates the mutable state containers and TSL uniforms corresponding to a normalized schema.
 */
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

// Internal type guards
function isFolderWrapper(val: unknown): val is FolderWrapper<DebugSchema> {
  return typeof val === "object" && val !== null && "isFolderWrapper" in val;
}

function isButton(val: unknown): val is ButtonControl {
  return typeof val === "function";
}

function isControlConfig(val: unknown): val is ControlConfig {
  return typeof val === "object" && val !== null && "value" in val;
}

function isNumberConfig(val: unknown): val is NumberControl {
  return isControlConfig(val) && typeof val.value === "number";
}

function isColor(val: unknown): val is Color | `#${string}` {
  return (
    val instanceof Color || (typeof val === "string" && val.startsWith("#"))
  );
}

function isThreeVector(val: unknown): val is AnyVectorOutput {
  return (
    val instanceof Vector2 || val instanceof Vector3 || val instanceof Vector4
  );
}

function isOptionValue(value: unknown): value is OptionValue {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function isOptionValueArray(value: unknown): value is readonly OptionValue[] {
  return Array.isArray(value) && value.every(isOptionValue);
}

function isOptionRecord(value: unknown): value is Record<string, OptionValue> {
  return isPlainObject(value) && Object.values(value).every(isOptionValue);
}

function isOptionsConfig(val: unknown): val is OptionsControl {
  if (!isControlConfig(val) || !("options" in val)) return false;
  return isOptionValueArray(val.options) || isOptionRecord(val.options);
}

function isPlainObject(val: unknown): val is Record<string, unknown> {
  return (
    typeof val === "object" &&
    val !== null &&
    Object.getPrototypeOf(val) === Object.prototype
  );
}

function isPlainVector(val: unknown): val is PlainVector {
  if (!isPlainObject(val)) return false;
  if (typeof val.x !== "number" || typeof val.y !== "number") return false;
  if ("w" in val) return typeof val.z === "number" && typeof val.w === "number";
  if ("z" in val) return typeof val.z === "number";

  return true;
}

function isNestedSchema(val: unknown): val is DebugSchema {
  return (
    isPlainObject(val) &&
    !isControlConfig(val) &&
    !isFolderWrapper(val) &&
    !isPlainVector(val)
  );
}

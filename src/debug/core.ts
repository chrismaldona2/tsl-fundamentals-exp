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
  VectorControl,
  UniformLeaf,
} from "./types";

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
  if (isOptionsConfig(value)) {
    return {
      kind: "options",
      value: value.value,
      options: value.options,
      ...base,
    };
  }

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

    const config = isConfig ? (value as VectorControl) : undefined;

    return {
      kind: "vector",
      value: vecValue,
      min: config?.min,
      max: config?.max,
      step: config?.step,
      labels: config?.labels,
      collapsed: config?.collapsed,
      ...base,
    };
  }

  throw new Error(
    `[Debug Controls] Unsupported schema value for key: "${key}"`,
  );
}

/**
 * Extracts a flattened dictionary of raw shader values required by R3F's uniform ledger.
 */
export function collectUniformCandidates(
  tree: Record<string, NormalizedNode>,
  prefix = "",
): UniformInputRecord {
  const out: UniformInputRecord = {};

  for (const [key, node] of Object.entries(tree)) {
    const path = prefix ? `${prefix}/${key}` : key;

    if (node.kind === "folder") {
      Object.assign(out, collectUniformCandidates(node.children, path));
    } else if (isUniformLeaf(node)) {
      out[path] = node.value;
    }
  }

  return out;
}

/**
 * Generates nested mutable state containers for non-shader controls.
 */
export function createPlainContainers(
  tree: Record<string, NormalizedNode>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const [key, node] of Object.entries(tree)) {
    if (node.kind === "folder") {
      out[key] = createPlainContainers(node.children);
    } else if (node.kind !== "button" && !isUniformLeaf(node)) {
      out[key] = { value: node.value };
    }
  }

  return out;
}

/**
 * Rebuilds the schema's hierarchy by merging the flat UniformNodes created by useUniforms
 * with the nested non-uniform controls.
 */
export function assembleNodes(
  tree: Record<string, NormalizedNode>,
  plain: Record<string, unknown>,
  ledger: Record<string, unknown>,
  prefix = "",
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const [key, node] of Object.entries(tree)) {
    const path = prefix ? `${prefix}/${key}` : key;

    if (node.kind === "folder") {
      out[key] = assembleNodes(
        node.children,
        plain[key] as Record<string, unknown>,
        ledger,
        path,
      );
    } else if (node.kind === "button") {
      continue; // Buttons carry no state
    } else {
      out[key] = isUniformLeaf(node) ? ledger[path] : plain[key];
    }
  }

  return out;
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

export function isUniformLeaf(node: NormalizedNode): node is UniformLeaf {
  return (
    node.kind !== "folder" &&
    node.kind !== "button" &&
    node.kind !== "options" &&
    node.kind !== "string" &&
    node.uniform === true
  );
}

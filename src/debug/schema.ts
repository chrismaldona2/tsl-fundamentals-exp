import { Color, Vector2, Vector3, Vector4 } from "three";
import type {
  DebugSchema,
  FolderWrapper,
  ButtonControl,
  ControlConfig,
  NumberControl,
  BooleanControl,
  StringControl,
  ColorControl,
  VectorControl,
  OptionsControl,
  NormalizedNode,
  PlainVector,
  AnyVectorOutput,
} from "./types";

// AST Generator
export function normalizeSchema(
  schema: DebugSchema,
): Record<string, NormalizedNode> {
  const tree: Record<string, NormalizedNode> = {};
  for (const [key, value] of Object.entries(schema)) {
    tree[key] = normalizeNode(key, value);
  }
  return tree;
}

function normalizeNode(key: string, value: unknown): NormalizedNode {
  if (isFolderWrapper(value)) {
    return {
      kind: "folder",
      name: value.name,
      collapsed: value.options?.collapsed ?? false,
      children: normalizeSchema(value.schema as DebugSchema),
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
    return { kind: "button", name: key, onClick: value };
  }

  const isConfig = isControlConfig(value);
  const raw = isConfig ? value.value : value;
  const name = isConfig && value.name ? value.name : key;
  const uniform = isConfig ? value.uniform !== false : true;

  if (isColor(raw)) {
    return {
      kind: "color",
      value: typeof raw === "string" ? new Color(raw) : raw,
      name,
      uniform,
      onChange: isColorConfig(value) ? value.onChange : undefined,
    };
  }

  if (isThreeVector(raw) || isPlainVector(raw)) {
    let vecValue: AnyVectorOutput;

    if (isThreeVector(raw)) {
      vecValue = raw;
    } else {
      if (typeof raw.w === "number" && typeof raw.z === "number")
        vecValue = new Vector4(raw.x, raw.y, raw.z, raw.w);
      else if (typeof raw.z === "number")
        vecValue = new Vector3(raw.x, raw.y, raw.z);
      else vecValue = new Vector2(raw.x, raw.y);
    }

    return {
      kind: "vector",
      value: vecValue,
      name,
      uniform,
      onChange: isVectorConfig(value) ? value.onChange : undefined,
    };
  }

  if (isOptionsConfig(value)) {
    return {
      kind: "options",
      value: raw,
      options: value.options,
      name,
      uniform,
      onChange: value.onChange,
    };
  }

  if (typeof raw === "number") {
    return {
      kind: "number",
      value: raw,
      name,
      uniform,
      min: isNumberConfig(value) ? value.min : undefined,
      max: isNumberConfig(value) ? value.max : undefined,
      step: isNumberConfig(value) ? value.step : undefined,
      onChange: isNumberConfig(value) ? value.onChange : undefined,
    };
  }

  if (typeof raw === "boolean") {
    return {
      kind: "boolean",
      value: raw,
      name,
      uniform,
      onChange: isBooleanConfig(value) ? value.onChange : undefined,
    };
  }

  if (typeof raw === "string") {
    return {
      kind: "string",
      value: raw,
      name,
      uniform,
      onChange: isStringConfig(value) ? value.onChange : undefined,
    };
  }

  throw new Error(
    `[Debug Controls] Unsupported schema value for key: "${key}"`,
  );
}

// React render syncer
export function syncCallbacks(
  tree: Record<string, NormalizedNode>,
  schema: DebugSchema,
) {
  for (const key in tree) {
    const node = tree[key];
    const rawValue = schema[key];

    if (node.kind === "folder") {
      const childSchema = isFolderWrapper(rawValue)
        ? (rawValue.schema as DebugSchema)
        : isNestedSchema(rawValue)
          ? rawValue
          : {};

      syncCallbacks(node.children, childSchema);
    } else if (node.kind === "button") {
      if (isButton(rawValue)) node.onClick = rawValue;
    } else if (isControlConfig(rawValue)) {
      if (node.kind === "number" && isNumberConfig(rawValue))
        node.onChange = rawValue.onChange;
      else if (node.kind === "boolean" && isBooleanConfig(rawValue))
        node.onChange = rawValue.onChange;
      else if (node.kind === "string" && isStringConfig(rawValue))
        node.onChange = rawValue.onChange;
      else if (node.kind === "color" && isColorConfig(rawValue))
        node.onChange = rawValue.onChange;
      else if (node.kind === "vector" && isVectorConfig(rawValue))
        node.onChange = rawValue.onChange;
      else if (node.kind === "options" && isOptionsConfig(rawValue))
        node.onChange = rawValue.onChange;
    } else {
      if ("onChange" in node) node.onChange = undefined;
    }
  }
}

// Internal type guards
function isFolderWrapper(val: unknown): val is FolderWrapper<unknown> {
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

function isBooleanConfig(val: unknown): val is BooleanControl {
  return isControlConfig(val) && typeof val.value === "boolean";
}

function isStringConfig(val: unknown): val is StringControl {
  return (
    isControlConfig(val) && typeof val.value === "string" && !isColor(val.value)
  );
}

function isColorConfig(val: unknown): val is ColorControl {
  return isControlConfig(val) && isColor(val.value);
}

function isVectorConfig(val: unknown): val is VectorControl {
  return (
    isControlConfig(val) &&
    (isThreeVector(val.value) || isPlainVector(val.value))
  );
}

function isOptionsConfig(val: unknown): val is OptionsControl {
  return isControlConfig(val) && "options" in val;
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

function isPlainVector(val: unknown): val is PlainVector {
  if (typeof val !== "object" || val === null) return false;
  const obj = val as Record<string, unknown>;
  return typeof obj.x === "number" && typeof obj.y === "number";
}

function isNestedSchema(val: unknown): val is DebugSchema {
  return (
    typeof val === "object" &&
    val !== null &&
    !isControlConfig(val) &&
    !isFolderWrapper(val) &&
    !isColor(val) &&
    !isThreeVector(val) &&
    !isPlainVector(val) &&
    !Array.isArray(val)
  );
}

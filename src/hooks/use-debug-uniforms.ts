import { useEffect, useState } from "react";
import { Color } from "three";
import { uniform } from "three/tsl";
import type { UniformNode } from "three/webgpu";
import {
  createDebugFolder,
  destroyDebugFolder,
  type DebugFolder,
} from "../debug/inspector";

export type FolderOptions = { collapsed?: boolean };

export type FolderWrapper<T> = {
  isFolderWrapper: true;
  name: string;
  schema: T;
  options?: FolderOptions;
};

export function folder<T extends SchemaInput>(
  name: string,
  schema: T,
  options?: FolderOptions,
): FolderWrapper<T> {
  return { isFolderWrapper: true, name, schema, options };
}

export type SchemaValue =
  | number
  | `#${string}`
  | boolean
  | Color
  | NumberControl
  | BooleanControl
  | ColorControl;

export type SchemaInput = {
  [key: string]: SchemaValue | SchemaInput | FolderWrapper<any>;
};

type MapValueToNode<T> = T extends `#${string}` | Color | ColorControl
  ? UniformNode<"color", Color>
  : T extends boolean | BooleanControl
    ? UniformNode<"bool", boolean>
    : UniformNode<"float", number>;

export type MapSchemaToNodes<T> = {
  [K in keyof T]: T[K] extends FolderWrapper<infer S>
    ? MapSchemaToNodes<S>
    : T[K] extends SchemaValue
      ? MapValueToNode<T[K]>
      : T[K] extends SchemaInput
        ? MapSchemaToNodes<T[K]>
        : never;
};

/**
 * Creates TSL uniforms and binds them directly to the Three.js WebGPU Inspector.
 */
export function useDebugUniforms<T extends SchemaInput>(
  folderName: string,
  schema: T,
  options?: FolderOptions,
): MapSchemaToNodes<T> {
  // Uniforms node instantiation
  const [nodes] = useState(() => generateNodes(schema) as MapSchemaToNodes<T>);

  // Inspector folders and controls setup
  useEffect(() => {
    const folder = createDebugFolder(folderName);
    if (options?.collapsed) folder.close();

    populateFolder(folder, schema, nodes as Record<string, unknown>);

    return () => destroyDebugFolder(folder);
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [folderName]);

  return nodes;
}

// Internal implementation details
type DebugUniform =
  | UniformNode<"color", Color>
  | UniformNode<"bool", boolean>
  | UniformNode<"float", number>;

type BaseControl<T> = { value: T; name?: string };
type NumberControl = BaseControl<number> & {
  min?: number;
  max?: number;
  step?: number;
};
type BooleanControl = BaseControl<boolean>;
type ColorControl = BaseControl<`#${string}` | Color>;
type ControlObject = NumberControl | BooleanControl | ColorControl;

function isFolderWrapper(val: unknown): val is FolderWrapper<any> {
  return typeof val === "object" && val !== null && "isFolderWrapper" in val;
}

function isFolder(val: unknown): val is SchemaInput {
  return (
    typeof val === "object" &&
    val !== null &&
    !(val instanceof Color) &&
    !isControlObject(val) &&
    !isFolderWrapper(val)
  );
}

function isControlObject(val: unknown): val is ControlObject {
  return (
    typeof val === "object" &&
    val !== null &&
    !(val instanceof Color) &&
    "value" in val
  );
}

function isNumberControl(val: SchemaValue): val is NumberControl {
  return isControlObject(val) && typeof val.value === "number";
}

function isColor(value: unknown): value is `#${string}` | Color {
  return (
    (typeof value === "string" && value.startsWith("#")) ||
    value instanceof Color
  );
}

function createUniform(schemaValue: SchemaValue): DebugUniform {
  const raw = isControlObject(schemaValue) ? schemaValue.value : schemaValue;

  if (isColor(raw)) {
    const colorObj = typeof raw === "string" ? new Color(raw) : raw;
    return uniform(colorObj, "color");
  }

  if (typeof raw === "boolean") return uniform(raw, "bool");

  return uniform(raw as number, "float");
}

function generateNodes(schema: Record<string, any>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(schema)) {
    if (isFolderWrapper(value)) {
      result[key] = generateNodes(value.schema);
    } else if (isFolder(value)) {
      result[key] = generateNodes(value);
    } else {
      result[key] = createUniform(value as SchemaValue);
    }
  }

  return result;
}

function populateFolder(
  parent: DebugFolder,
  schema: Record<string, any>,
  nodes: Record<string, unknown>,
) {
  for (const [key, value] of Object.entries(schema)) {
    if (isFolderWrapper(value)) {
      const childFolder = parent.addFolder(value.name);
      populateFolder(
        childFolder,
        value.schema,
        nodes[key] as Record<string, unknown>,
      );
      if (value.options?.collapsed) childFolder.close();
    } else if (isFolder(value)) {
      const childFolder = parent.addFolder(key);
      populateFolder(childFolder, value, nodes[key] as Record<string, unknown>);
    } else {
      addControl(parent, key, value as SchemaValue, nodes[key] as DebugUniform);
    }
  }
}

function addControl(
  folder: DebugFolder,
  key: string,
  schemaValue: SchemaValue,
  node: DebugUniform,
) {
  const isObj = isControlObject(schemaValue);
  const raw = isObj ? schemaValue.value : schemaValue;
  const nameToUse = isObj && schemaValue.name ? schemaValue.name : key;

  if (isColor(raw)) {
    return folder
      .addColor(node as UniformNode<"color", Color>, "value")
      .name(nameToUse);
  }

  if (isNumberControl(schemaValue)) {
    const floatNode = node as UniformNode<"float", number>;
    const { min, max, step } = schemaValue;

    if (min !== undefined && max !== undefined) {
      return step !== undefined
        ? folder.add(floatNode, "value", min, max, step).name(nameToUse)
        : folder.add(floatNode, "value", min, max).name(nameToUse);
    }
    if (min !== undefined) {
      return folder.add(floatNode, "value", min).name(nameToUse);
    }
    return folder.add(floatNode, "value").name(nameToUse);
  }

  if (typeof raw === "number") {
    return folder
      .add(node as UniformNode<"float", number>, "value")
      .name(nameToUse);
  }

  if (typeof raw === "boolean") {
    return folder
      .add(node as UniformNode<"bool", boolean>, "value")
      .name(nameToUse);
  }

  throw new Error(`Unsupported debug schema value for key: ${key}`);
}

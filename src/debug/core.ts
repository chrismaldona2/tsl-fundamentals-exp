import type { Color } from "three";
import {
  addBoolean,
  addColor,
  addFolder,
  addNumber,
  addSelect,
  addText,
} from "./inspector";
import type {
  ControlNode,
  Dispose,
  FolderNode,
  Group,
  Schema,
  SchemaNode,
  Slot,
} from "./types";

type Rec = Record<string, unknown>;
type Access = { get(): unknown; set(value: unknown): void };

const AXES = ["x", "y", "z", "w"] as const;
type Axis = (typeof AXES)[number];
type VectorLike = Partial<Record<Axis, number>>;

function isRecord(v: unknown): v is Rec {
  return typeof v === "object" && v !== null;
}

function isNumber(v: unknown): v is number {
  return typeof v === "number";
}

function isBoolean(v: unknown): v is boolean {
  return typeof v === "boolean";
}

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isChoice(v: unknown): v is string | number | boolean {
  return isString(v) || isNumber(v) || isBoolean(v);
}

function isColor(v: unknown): v is Color {
  return isRecord(v) && v.isColor === true;
}

function isVector(v: unknown): v is VectorLike {
  return (
    isRecord(v) &&
    isNumber(v.x) &&
    isNumber(v.y) &&
    (!("z" in v) || isNumber(v.z)) &&
    (!("w" in v) || isNumber(v.w))
  );
}

function isFolderNode(v: SchemaNode | undefined): v is FolderNode {
  return v !== undefined && "isFolder" in v && v.isFolder === true;
}

function resolveTarget(target: unknown): Rec | null {
  const resolved =
    isRecord(target) && "current" in target ? target.current : target;
  return isRecord(resolved) ? resolved : null;
}

function accessOf(target: Rec, key: string): Access {
  return {
    get() {
      const prop = target[key];
      return isRecord(prop) && "value" in prop ? prop.value : prop;
    },
    set(value) {
      const prop = target[key];
      if (isRecord(prop) && "value" in prop) prop.value = value;
      else target[key] = value;
    },
  };
}

function typedSlot<T>(
  access: Access,
  guard: (v: unknown) => v is T,
  fallback: T,
  label: string,
): Slot<T> {
  let warned = false;
  return {
    get() {
      const value = access.get();
      if (guard(value)) return value;
      if (!warned) {
        warned = true;
        console.warn(`[DebugControls] "${label}" changed type after mount`);
      }
      return fallback;
    },
    set(value) {
      if (guard(access.get())) access.set(value);
    },
  };
}

function colorSlot(access: Access): Slot<number> {
  return {
    get() {
      const color = access.get();
      return isColor(color) ? color.getHex() : 0;
    },
    set(hex) {
      const color = access.get();
      if (isColor(color)) color.setHex(hex);
    },
  };
}

function axisSlot(access: Access, axis: Axis): Slot<number> {
  return {
    get() {
      const vector = access.get();
      return isVector(vector) ? (vector[axis] ?? 0) : 0;
    },
    set(value) {
      const vector = access.get();
      if (isVector(vector)) vector[axis] = value;
    },
  };
}

function findNode(
  root: Schema,
  path: readonly string[],
): SchemaNode | undefined {
  let schema: Schema = root;
  let node: SchemaNode | undefined;
  for (const key of path) {
    node = schema[key];
    if (node === undefined) return undefined;
    if (isFolderNode(node)) schema = node.children;
    else if (key !== path[path.length - 1]) return undefined;
  }
  return node;
}

function mountControl(
  group: Group,
  target: Rec,
  label: string,
  node: ControlNode,
  notify: (value: unknown) => void,
  own: Dispose[],
): void {
  const access = accessOf(target, node.property ?? "value");
  const value = access.get();

  if (value === undefined) {
    console.warn(`[DebugControls] "${label}": property not found on target`);
    return;
  }

  const onChange = () => notify(access.get());
  const { min, max, step, options: choices } = node;

  if (choices !== undefined && isChoice(value)) {
    own.push(
      addSelect(group, typedSlot(access, isChoice, value, label), {
        name: label,
        onChange,
        options: choices,
      }),
    );
  } else if (isNumber(value)) {
    own.push(
      addNumber(group, typedSlot(access, isNumber, 0, label), {
        name: label,
        onChange,
        min,
        max,
        step,
      }),
    );
  } else if (isBoolean(value)) {
    own.push(
      addBoolean(group, typedSlot(access, isBoolean, false, label), {
        name: label,
        onChange,
      }),
    );
  } else if (isString(value)) {
    own.push(
      addText(group, typedSlot(access, isString, "", label), {
        name: label,
        onChange,
      }),
    );
  } else if (isColor(value)) {
    own.push(addColor(group, colorSlot(access), { name: label, onChange }));
  } else if (isVector(value)) {
    const folder = addFolder(group, label, { collapsed: node.collapsed });
    own.push(folder.dispose);
    for (const axis of AXES) {
      if (!isNumber(value[axis])) continue;
      own.push(
        addNumber(folder.group, axisSlot(access, axis), {
          name: node.labels?.[axis] ?? axis,
          onChange,
          min,
          max,
          step,
        }),
      );
    }
  } else {
    console.warn(`[DebugControls] "${label}" has an unsupported value type`);
  }
}

function mountSchema(
  group: Group,
  schema: Schema,
  path: readonly string[],
  getRoot: () => Schema,
  own: Dispose[],
): void {
  for (const [key, node] of Object.entries(schema)) {
    const nodePath = [...path, key];

    if (isFolderNode(node)) {
      const sub = addFolder(group, key, node.options);
      own.push(sub.dispose);
      mountSchema(sub.group, node.children, nodePath, getRoot, own);
      continue;
    }

    const target = resolveTarget(node.target);
    if (!target) {
      console.warn(
        `[DebugControls] Target for "${nodePath.join("/")}" is null, skipped`,
      );
      continue;
    }

    const notify = (value: unknown) => {
      const latest = findNode(getRoot(), nodePath);
      if (!latest || isFolderNode(latest)) return;
      (latest.onChange as ((v: unknown) => void) | undefined)?.(value);
    };

    mountControl(group, target, key, node, notify, own);
  }
}

export function mountControls(group: Group, getRoot: () => Schema): Dispose {
  const own: Dispose[] = [];

  try {
    mountSchema(group, getRoot(), [], getRoot, own);
  } catch (error) {
    for (const dispose of own.reverse()) dispose();
    throw error;
  }

  return () => {
    for (const dispose of own.reverse()) dispose();
  };
}

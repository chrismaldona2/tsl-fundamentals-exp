import type { Color } from "three";
import {
  addAction,
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

type Access = {
  get(): unknown;
  set(value: unknown): void;
  invoke(): void;
};

type Resolve = () => ControlNode | null;

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
function isFunction(v: unknown): v is () => void {
  return typeof v === "function";
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
function isControlNode(v: SchemaNode | undefined): v is ControlNode {
  return v !== undefined && typeof v !== "function" && !isFolderNode(v);
}

function isFolderNode(v: SchemaNode | undefined): v is FolderNode {
  return v !== undefined && "isFolder" in v && v.isFolder === true;
}

function resolveTarget(target: unknown): Rec | null {
  const resolved =
    isRecord(target) && "current" in target ? target.current : target;
  return isRecord(resolved) ? resolved : null;
}

function findNode(
  root: Schema,
  path: readonly string[],
): SchemaNode | undefined {
  let schema: Schema = root;
  let node: SchemaNode | undefined;
  for (let i = 0; i < path.length; i++) {
    node = schema[path[i]];
    if (node === undefined) return undefined;
    if (isFolderNode(node)) schema = node.children;
    else if (i !== path.length - 1) return undefined;
  }
  return node;
}

function controlAt(
  getRoot: () => Schema,
  path: readonly string[],
): ControlNode | null {
  const node = findNode(getRoot(), path);
  return isControlNode(node) ? node : null;
}

type Located = { readonly target: Rec; readonly key: string | null };

function locate(node: ControlNode | null): Located | null {
  if (node === null) return null;
  const target = resolveTarget(node.target);
  if (target === null) return null;
  if (node.property === undefined && !("value" in target)) {
    return { target, key: null };
  }
  return { target, key: node.property ?? "value" };
}

function accessOf(resolve: Resolve): Access {
  return {
    get() {
      const at = locate(resolve());
      if (at === null) return undefined;
      if (at.key === null) return at.target;
      const prop = at.target[at.key];
      return isRecord(prop) && "value" in prop ? prop.value : prop;
    },
    set(value) {
      const at = locate(resolve());
      if (at === null || at.key === null) return;
      const prop = at.target[at.key];
      if (isRecord(prop) && "value" in prop) prop.value = value;
      else at.target[at.key] = value;
    },
    invoke() {
      const at = locate(resolve());
      if (at === null || at.key === null) return;
      const fn = at.target[at.key];
      if (isFunction(fn)) fn.call(at.target);
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
        console.warn(`[DebugControls] "${label}" changed type after mount.`);
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

function mountControl(
  group: Group,
  label: string,
  resolve: Resolve,
  notify: (value: unknown) => void,
  own: Dispose[],
): void {
  const node = resolve();
  if (node === null) return;

  const access = accessOf(resolve);
  const value = access.get();

  if (value === undefined) {
    console.warn(`[DebugControls] "${label}": property not found on target.`);
    return;
  }

  const onChange = () => notify(access.get());
  const { min, max, step, options: choices } = node;

  if (choices !== undefined && !isChoice(value)) {
    console.warn(
      `[DebugControls] "${label}": \`options\` ignored, value isn't a string, number or boolean.`,
    );
  }

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
  } else if (isFunction(value)) {
    own.push(addAction(group, () => access.invoke(), { name: label }));
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
    console.warn(`[DebugControls] "${label}" has an unsupported value type.`);
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

    if (typeof node === "function") {
      const run = () => {
        const latest = findNode(getRoot(), nodePath);
        if (typeof latest === "function") latest();
      };
      own.push(addAction(group, run, { name: key }));
      continue;
    }

    if (isFolderNode(node)) {
      const sub = addFolder(group, key, node.options);
      own.push(sub.dispose);
      mountSchema(sub.group, node.children, nodePath, getRoot, own);
      continue;
    }

    if (resolveTarget(node.target) === null) {
      console.warn(
        `[DebugControls] Target for "${nodePath.join("/")}" is null, skipped.`,
      );
      continue;
    }

    const resolve: Resolve = () => controlAt(getRoot, nodePath);
    const notify = (value: unknown) => resolve()?.onChange?.(value);

    mountControl(group, key, resolve, notify, own);
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

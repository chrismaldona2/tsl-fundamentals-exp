import type { InspectorAdapter } from "../adapter/inspector";
import type {
  ControlHandle,
  ControlNode,
  Dispose,
  Group,
  MountedControls,
  Schema,
  SchemaNode,
} from "../types";
import {
  AXES,
  isBoolean,
  isChoice,
  isColor,
  isControlledNode,
  isControlNode,
  isFolderNode,
  isFunction,
  isHexColorString,
  isNumber,
  isRgb,
  isString,
  isTargetNode,
  isVector,
} from "./guards";
import {
  type Resolve,
  accessOf,
  axisSlot,
  colorSlot,
  createNotifier,
  hexNumberSlot,
  hexStringSlot,
  hexStringToNumber,
  resolveTarget,
  rgbSlot,
  typedSlot,
} from "./slots";

type Syncer = () => void;

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

function mountControl(
  adapter: InspectorAdapter,
  group: Group,
  label: string,
  resolve: Resolve,
  own: Dispose[],
  syncers: Syncer[],
): void {
  const node = resolve();
  if (node === null) return;

  const access = accessOf(resolve);
  const value = access.get();

  if (value === undefined) {
    console.warn(`[DebugControls] "${label}": property not found on target.`);
    return;
  }

  const controlled = isControlledNode(node);
  if (controlled && node.onChange === undefined) {
    console.warn(
      `[DebugControls] "${label}" is controlled (\`value\`) without an \`onChange\` handler.`,
    );
  }

  let lastKnown: unknown = value;
  const notifier = createNotifier(
    resolve,
    controlled
      ? (emitted) => {
          lastKnown = emitted;
        }
      : undefined,
  );
  own.push(notifier.cancel);

  const onWrite = (next: unknown) => notifier.notify(next);

  const bindHandle = <T>(
    handle: ControlHandle<T>,
    toEditor: (raw: unknown) => T | undefined,
  ) => {
    own.push(handle.dispose);

    if (!controlled) return;

    syncers.push(() => {
      const next = access.get();
      if (Object.is(next, lastKnown)) return;
      const converted = toEditor(next);
      if (converted === undefined) return;
      lastKnown = next;
      handle.push(converted);
    });
  };

  const { min, max, step, info, options: choices, color } = node;
  const spec = { name: label, info };

  if (choices !== undefined && !isChoice(value)) {
    console.warn(
      `[DebugControls] "${label}": \`options\` ignored, value isn't a string, number, or boolean.`,
    );
  }

  if (choices !== undefined && isChoice(value)) {
    bindHandle(
      adapter.addSelect(
        group,
        typedSlot(access, isChoice, value, label, onWrite),
        { ...spec, options: choices },
      ),
      (v) => (isChoice(v) ? v : undefined),
    );
  } else if (color === true && isNumber(value)) {
    bindHandle(
      adapter.addColor(group, hexNumberSlot(access, onWrite), spec),
      (v) => (isNumber(v) ? v : undefined),
    );
  } else if (color !== false && isHexColorString(value)) {
    bindHandle(
      adapter.addColor(group, hexStringSlot(access, onWrite), spec),
      (v) => (isHexColorString(v) ? hexStringToNumber(v) : undefined),
    );
  } else if (isColor(value)) {
    own.push(adapter.addColor(group, colorSlot(access, onWrite), spec).dispose);
  } else if (isRgb(value)) {
    own.push(adapter.addColor(group, rgbSlot(access, onWrite), spec).dispose);
  } else if (isNumber(value)) {
    bindHandle(
      adapter.addNumber(group, typedSlot(access, isNumber, 0, label, onWrite), {
        ...spec,
        min,
        max,
        step,
      }),
      (v) => (isNumber(v) ? v : undefined),
    );
  } else if (isBoolean(value)) {
    bindHandle(
      adapter.addBoolean(
        group,
        typedSlot(access, isBoolean, false, label, onWrite),
        spec,
      ),
      (v) => (isBoolean(v) ? v : undefined),
    );
  } else if (isString(value)) {
    bindHandle(
      adapter.addText(
        group,
        typedSlot(access, isString, "", label, onWrite),
        spec,
      ),
      (v) => (isString(v) ? v : undefined),
    );
  } else if (isFunction(value)) {
    own.push(adapter.addAction(group, () => access.invoke(), spec));
  } else if (isVector(value)) {
    const folder = adapter.acquireFolder(group, label, {
      collapsed: node.collapsed,
    });
    own.push(folder.dispose);

    for (const axis of AXES) {
      if (!isNumber(value[axis])) continue;
      own.push(
        adapter.addNumber(folder.group, axisSlot(access, axis, onWrite), {
          name: node.labels?.[axis] ?? axis,
          info,
          min,
          max,
          step,
        }).dispose,
      );
    }
  } else {
    console.warn(`[DebugControls] "${label}" has an unsupported value type.`);
  }
}

function mountSchema(
  adapter: InspectorAdapter,
  group: Group,
  schema: Schema,
  path: readonly string[],
  getRoot: () => Schema,
  own: Dispose[],
  syncers: Syncer[],
): void {
  for (const [key, node] of Object.entries(schema)) {
    const nodePath = [...path, key];

    if (typeof node === "function") {
      const run = () => {
        const latest = findNode(getRoot(), nodePath);
        if (typeof latest === "function") latest();
      };
      own.push(adapter.addAction(group, run, { name: key }));
      continue;
    }

    if (isFolderNode(node)) {
      const sub = adapter.acquireFolder(group, key, node.options);
      own.push(sub.dispose);
      mountSchema(
        adapter,
        sub.group,
        node.children,
        nodePath,
        getRoot,
        own,
        syncers,
      );
      continue;
    }

    if (isTargetNode(node) && resolveTarget(node.target) === null) {
      console.warn(
        `[DebugControls] Target for "${nodePath.join("/")}" is null, skipped.`,
      );
      continue;
    }

    const resolve: Resolve = () => controlAt(getRoot, nodePath);
    mountControl(adapter, group, key, resolve, own, syncers);
  }
}

export function mountControls(
  adapter: InspectorAdapter,
  group: Group,
  getRoot: () => Schema,
): MountedControls {
  const own: Dispose[] = [];
  const syncers: Syncer[] = [];

  try {
    mountSchema(adapter, group, getRoot(), [], getRoot, own, syncers);
  } catch (error) {
    for (const dispose of own.reverse()) dispose();
    throw error;
  }

  return {
    sync() {
      for (const run of syncers) run();
    },
    dispose() {
      syncers.length = 0;
      for (const dispose of own.reverse()) dispose();
    },
  };
}

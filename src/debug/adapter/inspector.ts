import { Inspector } from "three/addons/inspector/Inspector.js";
import type { WebGPURenderer } from "three/webgpu";
import {
  applyNumberLimits,
  removeEditor,
  removeFolder,
  removeRoot,
} from "./internals";
import type {
  ControlHandle,
  ControlSpec,
  Dispose,
  FolderOptions,
  Group,
  NumberOptions,
  Slot,
} from "../types";

const STOP_EVENTS = [
  "pointerdown",
  "click",
  "dblclick",
  "wheel",
  "keydown",
  "keyup",
] as const;

interface Shared<T> {
  readonly value: T;
  users: number;
}

interface Editor<T = unknown> {
  name(label: string): unknown;
  info(text: string): unknown;
  setValue(value: T): unknown;
  getValue(): T;
}

function once(fn: Dispose): Dispose {
  let done = false;
  return () => {
    if (done) return;
    done = true;
    fn();
  };
}

function acquire<K, V>(
  map: Map<K, Shared<V>>,
  key: K,
  create: () => V,
  destroy: (value: V) => void,
): { value: V; dispose: Dispose } {
  let entry = map.get(key);
  if (!entry) {
    entry = { value: create(), users: 0 };
    map.set(key, entry);
  }
  entry.users++;

  const owned = entry;
  return {
    value: owned.value,
    dispose: once(() => {
      if (--owned.users > 0) return;
      destroy(owned.value);
      if (map.get(key) === owned) map.delete(key);
    }),
  };
}

function isFullInspector(candidate: unknown): candidate is Inspector {
  return (
    candidate instanceof Inspector ||
    (typeof candidate === "object" &&
      candidate !== null &&
      "createParameters" in candidate &&
      typeof candidate.createParameters === "function")
  );
}

export function createInspector(options?: {
  readonly stopPropagation?: boolean;
}): Inspector {
  const inspector = new Inspector();

  if (options?.stopPropagation !== false) {
    for (const type of STOP_EVENTS) {
      inspector.domElement.addEventListener(type, (e) => e.stopPropagation());
    }
  }

  return inspector;
}

export function ensureInspector(renderer: WebGPURenderer): Inspector {
  if (isFullInspector(renderer.inspector)) {
    return renderer.inspector;
  }

  const inspector = createInspector();
  renderer.inspector = inspector;
  return inspector;
}

const adapters = new WeakMap<Inspector, InspectorAdapter>();

export class InspectorAdapter {
  private readonly inspector: Inspector;
  private readonly roots = new Map<string, Shared<Group>>();
  private readonly subfolders = new WeakMap<
    Group,
    Map<string, Shared<Group>>
  >();

  constructor(inspector: Inspector) {
    this.inspector = inspector;
  }

  static forInspector(inspector: Inspector): InspectorAdapter {
    let adapter = adapters.get(inspector);
    if (!adapter) {
      adapter = new InspectorAdapter(inspector);
      adapters.set(inspector, adapter);
    }
    return adapter;
  }

  static forRenderer(renderer: WebGPURenderer): InspectorAdapter {
    return InspectorAdapter.forInspector(ensureInspector(renderer));
  }

  acquireRoot(
    name: string,
    options?: FolderOptions,
  ): { group: Group; dispose: Dispose } {
    const { value, dispose } = acquire(
      this.roots,
      name,
      () =>
        this.applyFolderOptions(this.inspector.createParameters(name), options),
      (group) => removeRoot(group),
    );
    return { group: value, dispose };
  }

  acquireFolder(
    parent: Group,
    name: string,
    options?: FolderOptions,
  ): { group: Group; dispose: Dispose } {
    let siblings = this.subfolders.get(parent);
    if (!siblings) {
      siblings = new Map();
      this.subfolders.set(parent, siblings);
    }

    const { value, dispose } = acquire(
      siblings,
      name,
      () => this.applyFolderOptions(parent.addFolder(name), options),
      (child) => removeFolder(parent, child),
    );
    return { group: value, dispose };
  }

  addNumber(
    group: Group,
    slot: Slot<number>,
    spec: ControlSpec & NumberOptions,
  ): ControlHandle<number> {
    const { min, max, step } = spec;
    const isBounded = min !== undefined && max !== undefined;
    const isMinOnly = min !== undefined && max === undefined;

    let pushRef: ((value: number) => void) | null = null;

    const guardedSlot: Slot<number> = {
      get: () => slot.get(),
      set: (value) => {
        if (!Number.isFinite(value)) {
          pushRef?.(slot.get());
          return;
        }
        if (isMinOnly && value < min) {
          slot.set(min);
          pushRef?.(min);
          return;
        }
        slot.set(value);
      },
    };

    const handle = isBounded
      ? this.mountEditor(
          group,
          guardedSlot,
          spec,
          (proxy) =>
            group.add(
              proxy,
              "val",
              min,
              max,
              step,
            ) as unknown as Editor<number>,
        )
      : this.mountEditor(
          group,
          guardedSlot,
          spec,
          (proxy) => group.add(proxy, "val") as unknown as Editor<number>,
          // Omit `min` on min-only inputs to avoid ValueNumber's (Infinity - min) / 100 drag bug.
          (editor) =>
            applyNumberLimits(editor, {
              min: isMinOnly ? undefined : min,
              max,
              step,
            }),
        );

    pushRef = handle.push;
    return handle;
  }

  addBoolean(
    group: Group,
    slot: Slot<boolean>,
    spec: ControlSpec,
  ): ControlHandle<boolean> {
    return this.mountEditor(
      group,
      slot,
      spec,
      (proxy) => group.add(proxy, "val") as unknown as Editor<boolean>,
    );
  }

  addText(
    group: Group,
    slot: Slot<string>,
    spec: ControlSpec,
  ): ControlHandle<string> {
    return this.mountEditor(
      group,
      slot,
      spec,
      (proxy) => group.add(proxy, "val") as unknown as Editor<string>,
    );
  }

  addColor(
    group: Group,
    slot: Slot<number>,
    spec: ControlSpec,
  ): ControlHandle<number> {
    return this.mountEditor(
      group,
      slot,
      spec,
      (proxy) => group.addColor(proxy, "val") as unknown as Editor<number>,
    );
  }

  addSelect<T extends string | number | boolean>(
    group: Group,
    slot: Slot<T>,
    spec: ControlSpec & {
      readonly options: readonly T[] | Readonly<Record<string, T>>;
    },
  ): ControlHandle<T> {
    return this.mountEditor(
      group,
      slot,
      spec,
      (proxy) => group.add(proxy, "val", spec.options) as unknown as Editor<T>,
    );
  }

  addAction(group: Group, run: () => void, spec: ControlSpec): Dispose {
    const editor = group.add({ val: run }, "val") as unknown as Editor<unknown>;

    try {
      editor.name(spec.name);
      if (spec.info !== undefined) editor.info(spec.info);
    } catch (error) {
      removeEditor(group, editor);
      throw error;
    }

    return once(() => removeEditor(group, editor));
  }

  private applyFolderOptions(group: Group, options?: FolderOptions): Group {
    if (options?.collapsed) group.close();
    return group;
  }

  private mountEditor<T>(
    group: Group,
    slot: Slot<T>,
    spec: ControlSpec,
    create: (proxy: { val: T }) => Editor<T>,
    setup?: (editor: Editor<T>) => void,
  ): ControlHandle<T> {
    let syncing = false;

    const proxy = {
      get val() {
        return slot.get();
      },
      set val(v: T) {
        if (syncing) return;
        slot.set(v);
      },
    };

    const editor = create(proxy);

    try {
      editor.name(spec.name);
      if (spec.info !== undefined) editor.info(spec.info);
      setup?.(editor);
    } catch (error) {
      removeEditor(group, editor);
      throw error;
    }

    const push = (value: T) => {
      syncing = true;
      try {
        editor.setValue(value);
      } finally {
        syncing = false;
      }
    };

    return {
      push,
      dispose: once(() => removeEditor(group, editor)),
    };
  }
}

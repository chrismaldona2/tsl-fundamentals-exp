import { Inspector } from "three/addons/inspector/Inspector.js";
import {
  applyNumberLimits,
  removeEditor,
  removeFolder,
  removeRoot,
} from "./inspector-internals";
import type {
  ControlSpec,
  Dispose,
  FolderOptions,
  Group,
  NumberOptions,
  Slot,
} from "./types";

const STOP_EVENTS = [
  "pointerdown",
  "click",
  "dblclick",
  "wheel",
  "keydown",
  "keyup",
] as const;

let inspector: Inspector | null = null;

export function getInspector(): Inspector {
  if (!inspector) {
    inspector = new Inspector();
    for (const type of STOP_EVENTS) {
      inspector.domElement.addEventListener(type, (e) => e.stopPropagation());
    }
  }
  return inspector;
}

type Shared = { group: Group; users: number };
const roots = new Map<string, Shared>();
const subfolders = new WeakMap<Group, Map<string, Shared>>();

function applyOptions(group: Group, options?: FolderOptions): Group {
  if (options?.collapsed) group.close();
  return group;
}

function once(fn: Dispose): Dispose {
  let done = false;
  return () => {
    if (done) return;
    done = true;
    fn();
  };
}

export function mountRoot(
  name: string,
  options?: FolderOptions,
): { group: Group; dispose: Dispose } {
  let shared = roots.get(name);
  if (!shared) {
    const group = applyOptions(getInspector().createParameters(name), options);
    shared = { group, users: 0 };
    roots.set(name, shared);
  }
  shared.users++;

  const entry = shared;
  return {
    group: entry.group,
    dispose: once(() => {
      if (--entry.users > 0) return;
      removeRoot(entry.group);
      if (roots.get(name) === entry) roots.delete(name);
    }),
  };
}

export function addFolder(
  parent: Group,
  name: string,
  options?: FolderOptions,
): { group: Group; dispose: Dispose } {
  let siblings = subfolders.get(parent);
  if (!siblings) {
    siblings = new Map();
    subfolders.set(parent, siblings);
  }

  let shared = siblings.get(name);
  if (!shared) {
    const group = applyOptions(parent.addFolder(name), options);
    shared = { group, users: 0 };
    siblings.set(name, shared);
  }
  shared.users++;

  const entry = shared;
  const map = siblings;
  return {
    group: entry.group,
    dispose: once(() => {
      if (--entry.users > 0) return;
      removeFolder(parent, entry.group);
      if (map.get(name) === entry) map.delete(name);
    }),
  };
}

function proxyOf<T>(slot: Slot<T>): { val: T } {
  return {
    get val() {
      return slot.get();
    },
    set val(v: T) {
      slot.set(v);
    },
  };
}

type Editor = {
  name(label: string): unknown;
  onChange(callback: () => void): unknown;
};

function mount(
  group: Group,
  spec: ControlSpec,
  create: () => Editor,
  setup?: (editor: Editor) => void,
): Dispose {
  const editor = create();

  try {
    editor.name(spec.name);
    if (spec.onChange) editor.onChange(spec.onChange);
    setup?.(editor);
  } catch (error) {
    removeEditor(group, editor);
    throw error;
  }

  return once(() => removeEditor(group, editor));
}

export function addNumber(
  group: Group,
  slot: Slot<number>,
  spec: ControlSpec & NumberOptions,
): Dispose {
  const proxy = proxyOf(slot);
  const { min, max, step } = spec;

  if (min !== undefined && max !== undefined) {
    return mount(group, spec, () => group.add(proxy, "val", min, max, step));
  }

  return mount(
    group,
    spec,
    () => group.add(proxy, "val"),
    (editor) => applyNumberLimits(editor, { min, max, step }),
  );
}

export function addBoolean(
  group: Group,
  slot: Slot<boolean>,
  spec: ControlSpec,
): Dispose {
  return mount(group, spec, () => group.add(proxyOf(slot), "val"));
}

export function addText(
  group: Group,
  slot: Slot<string>,
  spec: ControlSpec,
): Dispose {
  return mount(group, spec, () => group.add(proxyOf(slot), "val"));
}

export function addColor(
  group: Group,
  slot: Slot<number>,
  spec: ControlSpec,
): Dispose {
  return mount(group, spec, () => group.addColor(proxyOf(slot), "val"));
}

export function addSelect<T extends string | number | boolean>(
  group: Group,
  slot: Slot<T>,
  spec: ControlSpec & {
    readonly options: readonly T[] | Readonly<Record<string, T>>;
  },
): Dispose {
  return mount(group, spec, () =>
    group.add(proxyOf(slot), "val", spec.options),
  );
}

export function addAction(
  group: Group,
  run: () => void,
  spec: ControlSpec,
): Dispose {
  return mount(group, spec, () => group.add({ val: run }, "val"));
}

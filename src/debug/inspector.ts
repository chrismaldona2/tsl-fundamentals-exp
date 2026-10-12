import { Inspector } from "three/addons/inspector/Inspector.js";
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
  "pointermove",
  "pointerup",
  "click",
  "dblclick",
  "wheel",
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

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

type Removable = { remove(item: unknown): unknown };

function isRemovable(v: unknown): v is Removable {
  return isRecord(v) && typeof v.remove === "function";
}

function hasGroups(v: unknown): v is { groups: unknown[] } {
  return isRecord(v) && Array.isArray(v.groups);
}

function detachRoot(group: Group): void {
  const { paramList } = group;

  const parent = "parent" in paramList ? paramList.parent : undefined;
  if (isRemovable(parent)) parent.remove(paramList);
  else paramList.domElement.remove();

  const inst = getInspector();
  const panel = "parameters" in inst ? inst.parameters : undefined;
  if (hasGroups(panel)) {
    const i = panel.groups.indexOf(group);
    if (i !== -1) panel.groups.splice(i, 1);
  }
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
      detachRoot(entry.group);
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
      entry.group.paramList.domElement.remove();
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

function rowOf(group: Group, editor: Editor): Element | null {
  if (!("domElement" in editor)) return null;
  const start = editor.domElement;
  if (!(start instanceof HTMLElement)) return null;

  const root = group.paramList.domElement;
  let el: HTMLElement | null = start;
  while (el && el.parentElement?.parentElement !== root) {
    el = el.parentElement;
  }
  return el;
}

function mount(group: Group, spec: ControlSpec, create: () => Editor): Dispose {
  const editor = create();
  editor.name(spec.name);
  if (spec.onChange) editor.onChange(spec.onChange);

  const row = rowOf(group, editor);
  if (!row) {
    console.warn(`[DebugControls] Could not locate the row for "${spec.name}"`);
  }
  return once(() => row?.remove());
}

export function addNumber(
  group: Group,
  slot: Slot<number>,
  spec: ControlSpec & NumberOptions,
): Dispose {
  const proxy = proxyOf(slot);
  const { min, max, step } = spec;

  if (min !== undefined && max !== undefined) {
    return mount(group, spec, () =>
      step !== undefined
        ? group.add(proxy, "val", min, max, step)
        : group.add(proxy, "val", min, max),
    );
  }
  if (min !== undefined)
    return mount(group, spec, () => group.add(proxy, "val", min));
  return mount(group, spec, () => group.add(proxy, "val"));
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

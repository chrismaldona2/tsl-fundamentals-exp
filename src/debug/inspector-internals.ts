import type { Group, NumberOptions } from "./types";

interface ItemNode {
  readonly parent: ItemNode | null;
  remove(item: unknown): unknown;
}

interface GroupEntry {
  readonly editor: unknown;
  readonly subItem: unknown;
}

interface ParametersTab {
  readonly groups: unknown[];
  hide(): unknown;
}

export type RuntimeGroup = Group & {
  readonly objects: GroupEntry[];
  readonly paramList: ItemNode;
  readonly parameters: ParametersTab;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isItemNode(v: unknown): v is ItemNode {
  return isRecord(v) && "parent" in v && typeof v.remove === "function";
}

function isParametersTab(v: unknown): v is ParametersTab {
  return isRecord(v) && Array.isArray(v.groups) && typeof v.hide === "function";
}

export function assertRuntimeGroup(
  group: Group,
): asserts group is RuntimeGroup {
  const candidate: unknown = group;
  if (
    !isRecord(candidate) ||
    !Array.isArray(candidate.objects) ||
    !isItemNode(candidate.paramList) ||
    !isParametersTab(candidate.parameters)
  ) {
    throw new Error(
      "[DebugControls] Unsupported three Inspector: ParametersGroup no longer " +
        "exposes `objects`, `paramList` and `parameters`. " +
        "Update inspector-internals.ts.",
    );
  }
}

export function removeEditor(group: Group, editor: unknown): void {
  assertRuntimeGroup(group);

  const index = group.objects.findIndex((entry) => entry.editor === editor);
  const entry = group.objects[index];
  if (entry === undefined) return;

  group.paramList.remove(entry.subItem);
  group.objects.splice(index, 1);
}

export function removeFolder(parent: Group, child: Group): void {
  assertRuntimeGroup(parent);
  assertRuntimeGroup(child);

  parent.paramList.remove(child.paramList);
}

export function removeRoot(group: Group): void {
  assertRuntimeGroup(group);

  const { groups } = group.parameters;
  const index = groups.indexOf(group);
  if (index === -1) return;

  group.paramList.parent?.remove(group.paramList);
  groups.splice(index, 1);

  if (groups.length === 0) group.parameters.hide();
}

export function applyNumberLimits(
  editor: unknown,
  limits: NumberOptions,
): void {
  const { min, max, step } = limits;
  if (min === undefined && max === undefined && step === undefined) return;

  const input = isRecord(editor) ? editor.input : undefined;
  if (!(input instanceof HTMLInputElement)) {
    throw new Error(
      "[DebugControls] ValueNumber no longer exposes `input`. " +
        "Update inspector-internals.ts.",
    );
  }

  if (min !== undefined) input.min = String(min);
  if (max !== undefined) input.max = String(max);
  if (step !== undefined) input.step = String(step);
}

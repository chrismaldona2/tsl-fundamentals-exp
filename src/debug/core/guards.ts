import type { Color } from "three";
import type {
  ControlledControlNode,
  ControlNode,
  FolderNode,
  RgbLike,
  SchemaNode,
  TargetControlNode,
  VectorLike,
} from "../types";

export type Rec = Record<string, unknown>;

export const AXES = ["x", "y", "z", "w"] as const;
export type Axis = (typeof AXES)[number];

const HEX_COLOR_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isRecord(v: unknown): v is Rec {
  return typeof v === "object" && v !== null;
}

export function isNumber(v: unknown): v is number {
  return typeof v === "number";
}

export function isBoolean(v: unknown): v is boolean {
  return typeof v === "boolean";
}

export function isString(v: unknown): v is string {
  return typeof v === "string";
}

export function isFunction(v: unknown): v is () => void {
  return typeof v === "function";
}

export function isChoice(v: unknown): v is string | number | boolean {
  return isString(v) || isNumber(v) || isBoolean(v);
}

export function isColor(v: unknown): v is Color {
  return isRecord(v) && v.isColor === true;
}

export function isRgb(v: unknown): v is RgbLike {
  return (
    isRecord(v) &&
    !isColor(v) &&
    isNumber(v.r) &&
    isNumber(v.g) &&
    isNumber(v.b)
  );
}

export function isHexColorString(v: unknown): v is string {
  return isString(v) && HEX_COLOR_RE.test(v);
}

export function isVector(v: unknown): v is VectorLike {
  return (
    isRecord(v) &&
    v.isQuaternion !== true &&
    isNumber(v.x) &&
    isNumber(v.y) &&
    (!("z" in v) || isNumber(v.z)) &&
    (!("w" in v) || isNumber(v.w))
  );
}

export function isFolderNode(v: SchemaNode | undefined): v is FolderNode {
  return v !== undefined && "isFolder" in v && v.isFolder === true;
}

export function isControlNode(v: SchemaNode | undefined): v is ControlNode {
  return v !== undefined && typeof v !== "function" && !isFolderNode(v);
}

export function isControlledNode(v: ControlNode): v is ControlledControlNode {
  return !("target" in v);
}

export function isTargetNode(v: ControlNode): v is TargetControlNode {
  return "target" in v;
}

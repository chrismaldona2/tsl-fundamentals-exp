import type { ControlNode, RgbLike, Slot, TargetControlNode } from "../types";
import {
  type Axis,
  type Rec,
  isColor,
  isControlledNode,
  isFunction,
  isHexColorString,
  isNumber,
  isRecord,
  isRgb,
  isVector,
} from "./guards";

export type Resolve = () => ControlNode | null;

export interface Access {
  get(): unknown;
  set(value: unknown): void;
  invoke(): void;
}

export interface Notifier {
  notify(value: unknown): void;
  cancel(): void;
}

type Located = { readonly target: Rec; readonly key: string | null };

export function resolveTarget(target: unknown): Rec | null {
  const resolved =
    isRecord(target) && "current" in target ? target.current : target;
  return isRecord(resolved) ? resolved : null;
}

function locate(node: TargetControlNode): Located | null {
  const target = resolveTarget(node.target);
  if (target === null) return null;
  if (node.property === undefined && !("value" in target)) {
    return { target, key: null };
  }
  return { target, key: node.property ?? "value" };
}

export function accessOf(resolve: Resolve): Access {
  return {
    get() {
      const node = resolve();
      if (node === null) return undefined;
      if (isControlledNode(node)) return node.value;

      const at = locate(node);
      if (at === null) return undefined;
      if (at.key === null) return at.target;
      const prop = at.target[at.key];
      return isRecord(prop) && "value" in prop ? prop.value : prop;
    },
    set(value) {
      const node = resolve();
      if (node === null || isControlledNode(node)) return;

      const at = locate(node);
      if (at === null || at.key === null) return;
      const prop = at.target[at.key];
      if (isRecord(prop) && "value" in prop) prop.value = value;
      else at.target[at.key] = value;
    },
    invoke() {
      const node = resolve();
      if (node === null || isControlledNode(node)) return;

      const at = locate(node);
      if (at === null || at.key === null) return;
      const fn = at.target[at.key];
      if (isFunction(fn)) fn.call(at.target);
    },
  };
}

export function createNotifier(
  resolve: Resolve,
  onEmit?: (value: unknown) => void,
): Notifier {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let cancelled = false;

  const clearTimer = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const emit = (value: unknown) => {
    if (cancelled) return;
    onEmit?.(value);
    resolve()?.onChange?.(value);
  };

  return {
    notify(value) {
      if (cancelled) return;
      clearTimer();

      const delay = Math.max(0, resolve()?.debounce ?? 0);
      if (delay > 0) {
        timer = setTimeout(() => {
          timer = null;
          emit(value);
        }, delay);
      } else {
        emit(value);
      }
    },
    cancel() {
      cancelled = true;
      clearTimer();
    },
  };
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function hexStringToNumber(hex: string): number {
  const raw = hex.slice(1);
  const full =
    raw.length === 3
      ? raw[0] + raw[0] + raw[1] + raw[1] + raw[2] + raw[2]
      : raw;
  return parseInt(full, 16);
}

export function numberToHexString(hex: number): string {
  return `#${(hex & 0xffffff).toString(16).padStart(6, "0")}`;
}

function rgbToHex(rgb: RgbLike): number {
  const r = Math.round(clamp01(rgb.r) * 255);
  const g = Math.round(clamp01(rgb.g) * 255);
  const b = Math.round(clamp01(rgb.b) * 255);
  return (r << 16) | (g << 8) | b;
}

function writeHexToRgb(hex: number, target: RgbLike): void {
  target.r = ((hex >> 16) & 255) / 255;
  target.g = ((hex >> 8) & 255) / 255;
  target.b = (hex & 255) / 255;
}

export function typedSlot<T>(
  access: Access,
  guard: (v: unknown) => v is T,
  fallback: T,
  label: string,
  onWrite: (value: T) => void,
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
      if (!guard(access.get())) return;
      access.set(value);
      onWrite(value);
    },
  };
}

export function colorSlot(
  access: Access,
  onWrite: (value: unknown) => void,
): Slot<number> {
  return {
    get() {
      const color = access.get();
      return isColor(color) ? color.getHex() : 0;
    },
    set(hex) {
      const color = access.get();
      if (!isColor(color)) return;
      color.setHex(hex);
      onWrite(color);
    },
  };
}

export function rgbSlot(
  access: Access,
  onWrite: (value: unknown) => void,
): Slot<number> {
  return {
    get() {
      const rgb = access.get();
      return isRgb(rgb) ? rgbToHex(rgb) : 0;
    },
    set(hex) {
      const rgb = access.get();
      if (!isRgb(rgb)) return;
      writeHexToRgb(hex, rgb);
      onWrite(rgb);
    },
  };
}

export function hexStringSlot(
  access: Access,
  onWrite: (value: string) => void,
): Slot<number> {
  return {
    get() {
      const value = access.get();
      return isHexColorString(value) ? hexStringToNumber(value) : 0;
    },
    set(hex) {
      const formatted = numberToHexString(hex);
      access.set(formatted);
      onWrite(formatted);
    },
  };
}

export function hexNumberSlot(
  access: Access,
  onWrite: (value: number) => void,
): Slot<number> {
  return {
    get() {
      const value = access.get();
      return isNumber(value) ? value : 0;
    },
    set(hex) {
      access.set(hex);
      onWrite(hex);
    },
  };
}

export function axisSlot(
  access: Access,
  axis: Axis,
  onWrite: (value: unknown) => void,
): Slot<number> {
  return {
    get() {
      const vector = access.get();
      return isVector(vector) ? (vector[axis] ?? 0) : 0;
    },
    set(value) {
      const vector = access.get();
      if (!isVector(vector)) return;
      vector[axis] = value;
      onWrite(vector);
    },
  };
}

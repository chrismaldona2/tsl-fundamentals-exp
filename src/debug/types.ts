import type { Color, Vector2, Vector3, Vector4 } from "three";
import type { UniformNode } from "three/webgpu";

// API
export type PlainVector = { x: number; y: number; z?: number; w?: number };
export type AnyVectorInput = Vector2 | Vector3 | Vector4 | PlainVector;
export type AnyVectorOutput = Vector2 | Vector3 | Vector4;

export type FolderOptions = { readonly collapsed?: boolean };

export type FolderWrapper<T> = {
  readonly isFolderWrapper: true;
  readonly name: string;
  readonly schema: T;
  readonly options?: FolderOptions;
};

export type BaseControl<TInput, TOutput = TInput> = {
  readonly value: TInput;
  readonly name?: string;
  readonly onChange?: (value: TOutput) => void;
  readonly uniform?: boolean;
};

export type NumberControl = BaseControl<number> & {
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
};

export type OptionsControl<T = unknown> = BaseControl<T> & {
  readonly options: readonly T[] | Record<string, T>;
};

export type ColorControl = BaseControl<`#${string}` | Color>;
export type BooleanControl = BaseControl<boolean>;
export type StringControl = BaseControl<string>;
export type VectorControl = BaseControl<AnyVectorInput, AnyVectorOutput>;
export type ButtonControl = () => void;

export type ControlConfig =
  | NumberControl
  | OptionsControl
  | ColorControl
  | BooleanControl
  | StringControl
  | VectorControl;

export type SchemaValue =
  | number
  | string
  | boolean
  | `#${string}`
  | Color
  | AnyVectorInput
  | ControlConfig
  | ButtonControl;

export type DebugSchema = {
  readonly [key: string]: SchemaValue | DebugSchema | FolderWrapper<unknown>;
};

// Inference logic
type ExtractNodeType<T> = T extends `#${string}` | Color
  ? UniformNode<"color", Color>
  : T extends Vector2 | { x: number; y: number; z?: never; w?: never }
    ? UniformNode<"vec2", Vector2>
    : T extends Vector3 | { x: number; y: number; z: number; w?: never }
      ? UniformNode<"vec3", Vector3>
      : T extends Vector4 | { x: number; y: number; z: number; w: number }
        ? UniformNode<"vec4", Vector4>
        : T extends PlainVector
          ?
              | UniformNode<"vec2", Vector2>
              | UniformNode<"vec3", Vector3>
              | UniformNode<"vec4", Vector4>
          : T extends boolean
            ? UniformNode<"bool", boolean>
            : T extends number
              ? UniformNode<"float", number>
              : { value: T };

export type MapValueToNode<T> = T extends ButtonControl
  ? never
  : T extends { readonly options: unknown }
    ? { value: T extends { readonly value: infer V } ? V : never }
    : T extends { readonly uniform: false; readonly value: infer V }
      ? V extends PlainVector
        ? { value: AnyVectorOutput }
        : { value: V }
      : T extends BaseControl<infer V, any>
        ? ExtractNodeType<V>
        : ExtractNodeType<T>;

// The final mapped result returned by the hook
export type DebugControlsResult<T> = {
  -readonly [K in keyof T as T[K] extends ButtonControl
    ? never
    : K]: T[K] extends FolderWrapper<infer S>
    ? DebugControlsResult<S>
    : T[K] extends
          | ControlConfig
          | Color
          | AnyVectorInput
          | string
          | number
          | boolean
      ? MapValueToNode<T[K]>
      : T[K] extends DebugSchema
        ? DebugControlsResult<T[K]>
        : MapValueToNode<T[K]>;
};

// Internal AST
export type NormalizedControl =
  | {
      kind: "number";
      value: number;
      min?: number;
      max?: number;
      step?: number;
      name: string;
      uniform: boolean;
      onChange?: (v: number) => void;
    }
  | {
      kind: "boolean";
      value: boolean;
      name: string;
      uniform: boolean;
      onChange?: (v: boolean) => void;
    }
  | {
      kind: "string";
      value: string;
      name: string;
      uniform: boolean;
      onChange?: (v: string) => void;
    }
  | {
      kind: "color";
      value: Color;
      name: string;
      uniform: boolean;
      onChange?: (v: Color | `#${string}`) => void;
    }
  | {
      kind: "vector";
      value: AnyVectorOutput;
      name: string;
      uniform: boolean;
      onChange?: (v: AnyVectorOutput) => void;
    }
  | {
      kind: "options";
      value: unknown;
      options: readonly unknown[] | Record<string, unknown>;
      name: string;
      uniform: boolean;
      onChange?: (v: unknown) => void;
    }
  | { kind: "button"; name: string; onClick: () => void };

export type NormalizedFolder = {
  kind: "folder";
  name: string;
  collapsed: boolean;
  children: Record<string, NormalizedNode>;
};

export type NormalizedNode = NormalizedControl | NormalizedFolder;

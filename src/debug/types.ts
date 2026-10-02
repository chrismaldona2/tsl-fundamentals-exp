import type { Color, Vector2, Vector3, Vector4 } from "three";
import type { UniformNode } from "three/webgpu";

// API
export type PlainVector =
  | { x: number; y: number; z?: never; w?: never }
  | { x: number; y: number; z: number; w?: never }
  | { x: number; y: number; z: number; w: number };

export type AnyVectorInput = Vector2 | Vector3 | Vector4 | PlainVector;

export type AnyVectorOutput = Vector2 | Vector3 | Vector4;

export type OptionValue = string | number | boolean;

export type FolderOptions = {
  /** Determines if the folder starts closed on the initial render. */
  readonly collapsed?: boolean;
};

export type FolderWrapper<T> = {
  readonly isFolderWrapper: true;
  readonly name: string;
  readonly schema: T;
  readonly options?: FolderOptions;
};

export type BaseControl<TInput, TOutput = TInput> = {
  readonly value: TInput;
  readonly name?: string;

  /**
   * When `true`, the returned value is a Three.js TSL UniformNode ready to use in shaders.
   *
   * When `false`, it returns a plain `{ value }` state container.
   *
   * Defaults to true.
   */
  readonly uniform?: boolean;
  onChange?(value: TOutput): void;
};

export type NumberControl = BaseControl<number> & {
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
};

export type OptionsControl<T extends OptionValue = OptionValue> =
  BaseControl<T> & {
    readonly options: readonly T[] | Record<string, T>;
  };

export type ColorControl = BaseControl<`#${string}` | Color>;

export type BooleanControl = BaseControl<boolean>;

export type StringControl = BaseControl<string>;

export type VectorBounds =
  | number
  | {
      readonly x?: number;
      readonly y?: number;
      readonly z?: number;
      readonly w?: number;
    };

export type VectorLabels = {
  readonly x?: string;
  readonly y?: string;
  readonly z?: string;
  readonly w?: string;
};

export type VectorControl = BaseControl<AnyVectorInput, AnyVectorOutput> & {
  readonly min?: VectorBounds;
  readonly max?: VectorBounds;
  readonly step?: VectorBounds;
  readonly labels?: VectorLabels;
  readonly collapsed?: boolean;
};

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
  : T extends Vector4 | { x: number; y: number; z: number; w: number }
    ? UniformNode<"vec4", Vector4>
    : T extends Vector3 | { x: number; y: number; z: number }
      ? UniformNode<"vec3", Vector3>
      : T extends Vector2 | { x: number; y: number }
        ? UniformNode<"vec2", Vector2>
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
      : T extends BaseControl<infer V, infer _>
        ? ExtractNodeType<V>
        : ExtractNodeType<T>;

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
    }
  | {
      kind: "boolean";
      value: boolean;
      name: string;
      uniform: boolean;
    }
  | {
      kind: "string";
      value: string;
      name: string;
      uniform: boolean;
    }
  | {
      kind: "color";
      value: Color;
      name: string;
      uniform: boolean;
    }
  | {
      kind: "vector";
      value: AnyVectorOutput;
      name: string;
      uniform: boolean;
      min?: VectorBounds;
      max?: VectorBounds;
      step?: VectorBounds;
      collapsed?: boolean;
      labels?: VectorLabels;
    }
  | {
      kind: "options";
      value: OptionValue;
      options: readonly OptionValue[] | Record<string, OptionValue>;
      name: string;
      uniform: boolean;
    }
  | { kind: "button"; name: string };

export type NormalizedFolder = {
  kind: "folder";
  name: string;
  collapsed: boolean;
  children: Record<string, NormalizedNode>;
};

export type NormalizedNode = NormalizedControl | NormalizedFolder;

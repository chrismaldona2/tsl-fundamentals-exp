import type { Color } from "three";
import type { ParametersGroup } from "three/addons/inspector/tabs/Parameters.js";

export type RefLike<T> = { readonly current: T | null };
export type Unwrap<T> = NonNullable<T extends RefLike<infer U> ? U : T>;

export type RgbLike = {
  r: number;
  g: number;
  b: number;
};

export type VectorLike = {
  x: number;
  y: number;
  z?: number;
  w?: number;
  readonly isQuaternion?: never;
};

export type ControlledValue = number | boolean | string;
type ColorLike = Color | RgbLike;
type DirectValue = ColorLike | VectorLike;
type Editable = ControlledValue | DirectValue;

type Wrapped<P> = P extends { value: infer U }
  ? U extends Editable
    ? U
    : never
  : never;

/** What a *property* can hold: primitives, Color/RGB/Vector, or a { value } wrapper. */
export type ValueOf<P> = [Wrapped<P>] extends [never]
  ? P extends Editable
    ? P
    : never
  : Wrapped<P>;

/** What a *target* can be on its own: a { value } wrapper or a bare Color/RGB/Vector. */
type SelfValue<P> = [Wrapped<P>] extends [never]
  ? P extends DirectValue
    ? P
    : never
  : Wrapped<P>;

export type EditableKeys<T> = {
  [K in keyof T]-?: [ValueOf<T[K]>] extends [never] ? never : K;
}[keyof T];

type Choice = string | number | boolean;
type Choices<V> = readonly V[] | Readonly<Record<string, V>>;

export type NumberOptions = {
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
};

type AxisLabels = Partial<Record<"x" | "y" | "z" | "w", string>>;

export type FolderOptions = {
  readonly collapsed?: boolean;
};

export type DebugControlsOptions = FolderOptions & {
  readonly enabled?: boolean;
  readonly deps?: readonly unknown[];
};

export type ControlConfig = NumberOptions & {
  readonly onChange?: (value: unknown) => void;
  readonly labels?: AxisLabels;
  readonly collapsed?: boolean;
  readonly options?: Choices<Choice>;
  readonly color?: boolean;
  readonly info?: string;
  readonly debounce?: number;
};

export type TargetControlNode = ControlConfig & {
  readonly target: unknown;
  readonly property?: string;
  readonly value?: never;
};

export type ControlledControlNode = ControlConfig & {
  readonly value: ControlledValue;
  readonly target?: never;
  readonly property?: never;
};

export type ControlNode = TargetControlNode | ControlledControlNode;

export interface FolderNode {
  readonly isFolder: true;
  readonly children: Schema;
  readonly options?: FolderOptions;
}

export type SchemaNode = ControlNode | FolderNode | (() => void);

export type Schema = Readonly<Record<string, SchemaNode>>;

type Opt<V, U, X> = [Extract<V, U>] extends [never] ? never : X;

type Config<V> = {
  readonly min?: Opt<V, number | VectorLike, number>;
  readonly max?: Opt<V, number | VectorLike, number>;
  readonly step?: Opt<V, number | VectorLike, number>;
  readonly labels?: Opt<V, VectorLike, AxisLabels>;
  readonly collapsed?: Opt<V, VectorLike, boolean>;
  readonly options?: Opt<V, Choice, Choices<Extract<V, Choice>>>;
  readonly color?: Opt<V, number | string, boolean>;
  readonly info?: string;
  readonly debounce?: number;
  onChange?(value: V): void;
};

type DefinedKey<P> = Exclude<P, undefined>;

type HasExplicitKey<P> = [DefinedKey<P>] extends [never]
  ? false
  : [PropertyKey] extends [DefinedKey<P>]
    ? false
    : true;

type ResolveValue<T, P> =
  HasExplicitKey<P> extends true
    ? [DefinedKey<P>] extends [keyof Unwrap<T>]
      ? ValueOf<Unwrap<T>[DefinedKey<P>]>
      : Editable
    : T extends ControlledValue
      ? T
      : SelfValue<Unwrap<T>>;

type ControlConstraints<T, P> = T extends ControlledValue
  ? { readonly target?: never; readonly property?: never }
  : [SelfValue<Unwrap<T>>] extends [never]
    ? HasExplicitKey<P> extends true
      ? {
          readonly property?: EditableKeys<Unwrap<T>>;
          readonly value?: never;
        }
      : {
          readonly property: EditableKeys<Unwrap<T>>;
          readonly value?: never;
        }
    : {
        readonly property?: EditableKeys<Unwrap<T>>;
        readonly value?: never;
      };

type SchemaEntry<T, P> =
  | ({
      readonly target?: T;
      readonly value?: T & ControlledValue;
    } & NoInfer<Config<ResolveValue<T, P>>> &
      NoInfer<ControlConstraints<T, P>>)
  | (unknown extends NoInfer<T> ? FolderNode | (() => void) : never);

export type SchemaOf<
  T extends Record<string, unknown>,
  P extends { readonly [K in keyof T]?: PropertyKey },
> = {
  readonly [K in keyof T]: SchemaEntry<T[K], K extends keyof P ? P[K] : never>;
} & {
  readonly [K in keyof P]?: { readonly property?: P[K] };
};

export type Group = ParametersGroup;
export type Dispose = () => void;

export type Slot<T> = {
  get(): T;
  set(value: T): void;
};

export type ControlSpec = {
  readonly name: string;
  readonly info?: string;
};

export type ControlHandle<T> = {
  readonly push: (value: T) => void;
  readonly dispose: Dispose;
};

export type MountedControls = {
  readonly sync: () => void;
  readonly dispose: Dispose;
};

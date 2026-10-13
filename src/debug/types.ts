import type { Color, Vector2, Vector3, Vector4 } from "three";
import type { ParametersGroup } from "three/addons/inspector/tabs/Parameters.js";

export type RefLike<T> = { readonly current: T | null };
export type Unwrap<T> = NonNullable<T extends RefLike<infer U> ? U : T>;

type Vector = Vector2 | Vector3 | Vector4;

type Editable = number | boolean | string | Color | Vector;

type DirectValue = Color | Vector;
type Wrapped<P> = P extends { value: infer U }
  ? U extends Editable
    ? U
    : never
  : never;

/** What a *property* can hold: primitives, Color/Vector, or a { value } wrapper. */
export type ValueOf<P> = [Wrapped<P>] extends [never]
  ? P extends Editable
    ? P
    : never
  : Wrapped<P>;

/** What a *target* can be on its own: a { value } wrapper or a bare Color/Vector. */
type SelfValue<P> = [Wrapped<P>] extends [never]
  ? P extends DirectValue
    ? P
    : never
  : Wrapped<P>;

type ValueLeaf<T> = [SelfValue<Tgt<T>>] extends [never]
  ? never
  : Config<SelfValue<Tgt<T>>> & {
      readonly target: T;
      readonly property?: Tgt<T> extends DirectValue ? never : "value";
    };

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

export type FolderOptions = { readonly collapsed?: boolean };

export type ControlConfig = NumberOptions & {
  readonly onChange?: (value: unknown) => void;
  readonly labels?: AxisLabels;
  readonly collapsed?: boolean;
  readonly options?: Choices<Choice>;
};

export type ControlNode = ControlConfig & {
  readonly target: unknown;
  readonly property?: string;
};

export interface FolderNode {
  readonly isFolder: true;
  readonly children: Schema;
  readonly options?: FolderOptions;
}

export type SchemaNode = ControlNode | FolderNode | (() => void);

export type SchemaOf<T> = {
  readonly [K in keyof T]: Leaf<T[K]> | FolderNode | (() => void);
};

export type Schema = Readonly<Record<string, SchemaNode>>;

type Tgt<T> = Unwrap<T>;

type Opt<V, U, X> = [Extract<V, U>] extends [never] ? never : X;

type Config<V> = {
  readonly min?: Opt<V, number | Vector, number>;
  readonly max?: Opt<V, number | Vector, number>;
  readonly step?: Opt<V, number | Vector, number>;
  readonly labels?: Opt<V, Vector, AxisLabels>;
  readonly collapsed?: Opt<V, Vector, boolean>;
  readonly options?: Opt<V, Choice, Choices<Extract<V, Choice>>>;
  onChange?(value: V): void;
};

type KeyLeaf<T> =
  Tgt<T> extends object
    ? {
        [K in EditableKeys<Tgt<T>>]: Config<ValueOf<Tgt<T>[K]>> & {
          readonly target: T;
          readonly property: K;
        };
      }[EditableKeys<Tgt<T>>]
    : never;

export type Leaf<T> = ValueLeaf<T> | KeyLeaf<T>;

export type Group = ParametersGroup;
export type Dispose = () => void;
export type Slot<T> = { get(): T; set(value: T): void };
export type ControlSpec = {
  readonly name: string;
  readonly onChange?: () => void;
};

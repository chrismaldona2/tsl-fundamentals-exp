import type { Color, Vector2, Vector3, Vector4 } from "three";
import type { ParametersGroup } from "three/addons/inspector/tabs/Parameters.js";

export type RefLike<T> = { readonly current: T | null };
export type Unwrap<T> = NonNullable<T extends RefLike<infer U> ? U : T>;

type Vector = Vector2 | Vector3 | Vector4;
type Editable = number | boolean | string | Color | Vector;

export type ValueOf<P> = P extends { value: infer U }
  ? U extends Editable
    ? U
    : never
  : P extends Editable
    ? P
    : never;

export type EditableKeys<T> = {
  [K in keyof T]-?: [ValueOf<T[K]>] extends [never] ? never : K;
}[keyof T];

type Common<V> = {
  readonly onChange?: (value: V) => void;
};

type Choice = string | number | boolean;
type Choices<V> = readonly V[] | Readonly<Record<string, V>>;

export type NumberOptions = {
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
};

type AxisLabels = Partial<Record<"x" | "y" | "z" | "w", string>>;

export type FolderOptions = { readonly collapsed?: boolean };

export type ControlConfig = Common<never> &
  NumberOptions & {
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

export type SchemaNode = ControlNode | FolderNode;
export type Schema = Readonly<Record<string, SchemaNode>>;

type Tgt<T> = Unwrap<T>;

type Val<T> = [ValueOf<Tgt<T>>] extends [never]
  ? ValueOf<Tgt<T>[EditableKeys<Tgt<T>>]>
  : ValueOf<Tgt<T>>;

type Prop<T> = [ValueOf<Tgt<T>>] extends [never]
  ? EditableKeys<Tgt<T>>
  : "value";

type Opt<V, U, X> = [Extract<V, U>] extends [never] ? never : X;

export type Leaf<T> = {
  readonly target: T;
  readonly property?: Prop<T>;
  readonly min?: Opt<Val<T>, number | Vector, number>;
  readonly max?: Opt<Val<T>, number | Vector, number>;
  readonly step?: Opt<Val<T>, number | Vector, number>;
  readonly labels?: Opt<Val<T>, Vector, AxisLabels>;
  readonly collapsed?: Opt<Val<T>, Vector, boolean>;
  readonly options?: Opt<Val<T>, Choice, Choices<Extract<Val<T>, Choice>>>;
  onChange?(value: Val<T>): void;
};

export type SchemaOf<T> = {
  readonly [K in keyof T]: Leaf<T[K]> | FolderNode;
};

export type Group = ParametersGroup;
export type Dispose = () => void;
export type Slot<T> = { get(): T; set(value: T): void };
export type ControlSpec = {
  readonly name: string;
  readonly onChange?: () => void;
};

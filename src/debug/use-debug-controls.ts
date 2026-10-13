import { useEffect, useLayoutEffect, useRef } from "react";
import { mountControls } from "./core";
import { mountRoot } from "./inspector";
import type {
  Dispose,
  FolderNode,
  FolderOptions,
  Schema,
  SchemaOf,
} from "./types";

export function folder<const T extends Record<string, unknown>>(
  children: SchemaOf<T>,
  options?: FolderOptions,
): FolderNode;

export function folder(children: Schema, options?: FolderOptions): FolderNode {
  return { isFolder: true, children, options };
}

const NO_DEPS: readonly unknown[] = [];

export function useDebugControls<const T extends Record<string, unknown>>(
  name: string,
  schema: SchemaOf<T>,
  options?: FolderOptions,
  deps?: readonly unknown[],
): void;

export function useDebugControls(
  name: string,
  schema: Schema,
  options?: FolderOptions,
  deps: readonly unknown[] = NO_DEPS,
): void {
  const latest = useRef<Schema>(schema);
  useLayoutEffect(() => {
    latest.current = schema;
  });

  useEffect(() => {
    const root = mountRoot(name, options);

    let release: Dispose;
    try {
      release = mountControls(root.group, () => latest.current);
    } catch (error) {
      root.dispose();
      throw error;
    }

    return () => {
      release();
      root.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, ...deps]);
}

import { useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useRef } from "react";
import { InspectorAdapter } from "./adapter/inspector";
import { mountControls } from "./core/mount";
import type {
  DebugControlsOptions,
  FolderNode,
  FolderOptions,
  MountedControls,
  Schema,
  SchemaOf,
} from "./types";

const NO_DEPS: readonly unknown[] = [];

export function folder<
  T extends Record<string, unknown>,
  const P extends { readonly [K in keyof T]?: PropertyKey },
>(children: SchemaOf<T, P>, options?: FolderOptions): FolderNode {
  return {
    isFolder: true,
    children: children as unknown as Schema,
    options,
  };
}

export function useDebugControls<
  T extends Record<string, unknown>,
  const P extends { readonly [K in keyof T]?: PropertyKey },
>(name: string, schema: SchemaOf<T, P>, options?: DebugControlsOptions): void {
  const renderer = useThree((s) => s.renderer);
  const enabled = options?.enabled ?? true;
  const collapsed = options?.collapsed;
  const deps = options?.deps ?? NO_DEPS;

  const latest = useRef<Schema>(schema as unknown as Schema);
  const mounted = useRef<MountedControls | null>(null);

  useLayoutEffect(() => {
    latest.current = schema as unknown as Schema;
  });

  useEffect(() => {
    if (!enabled || !renderer) return;

    const adapter = InspectorAdapter.forRenderer(renderer);
    const root = adapter.acquireRoot(name, { collapsed });

    let controls: MountedControls;
    try {
      controls = mountControls(adapter, root.group, () => latest.current);
    } catch (error) {
      root.dispose();
      throw error;
    }

    mounted.current = controls;

    return () => {
      mounted.current = null;
      controls.dispose();
      root.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderer, name, enabled, ...deps]);

  useEffect(() => {
    mounted.current?.sync();
  });
}

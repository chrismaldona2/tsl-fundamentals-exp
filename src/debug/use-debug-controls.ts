import { useEffect, useState, useRef, useMemo } from "react";
import {
  normalizeSchema,
  createPlainContainers,
  collectUniformCandidates,
  assembleNodes,
} from "./core";
import { renderTree } from "./controls";
import { createDebugFolder, destroyDebugFolder } from "./inspector";
import type { DebugSchema, DebugControlsResult, FolderOptions } from "./types";
import { useUniforms } from "@react-three/fiber/webgpu";

/**
 * Registers controls with the Three.js Inspector and returns their live state or TSL uniforms.
 */
export function useDebugControls<const T extends DebugSchema>(
  folderName: string,
  schema: T,
  scope: string, // Ensures uniforms survives Suspense and HMR
  options?: FolderOptions,
): DebugControlsResult<T> {
  // Parse schema
  const [tree] = useState(() => normalizeSchema(schema));
  const [plain] = useState(() => createPlainContainers(tree));
  const [candidates] = useState(() => collectUniformCandidates(tree));
  const [keys] = useState(() => Object.keys(candidates));

  // UniformNodes generation and final assemble
  const r3fLedger = useUniforms(candidates, scope);
  const ledgerRecord = r3fLedger as Record<string, unknown>;
  const nodeDependencies = keys.map((key) => ledgerRecord[key]);
  const nodes = useMemo(
    () => assembleNodes(tree, plain, ledgerRecord),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tree, plain, ...nodeDependencies],
  );

  // Keep a ref of the latest schema on every render to ensure fresh closures
  const schemaRef = useRef(schema);
  schemaRef.current = schema;

  // Bind to DOM Inspector
  useEffect(() => {
    const rootFolder = createDebugFolder(folderName);
    if (options?.collapsed) rootFolder.close();

    renderTree(rootFolder, tree, nodes, schemaRef);

    return () => destroyDebugFolder(rootFolder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderName, nodes]);

  return nodes as DebugControlsResult<T>;
}

/**
 * Wraps a nested schema to render it as a distinct folder group in the Three.js Inspector.
 */
export function folder<const T extends DebugSchema>(
  name: string,
  schema: T,
  options?: FolderOptions,
) {
  return { isFolderWrapper: true, name, schema, options } as const;
}

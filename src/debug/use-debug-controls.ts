import { useEffect, useState, useRef } from "react";
import { normalizeSchema, createNodes } from "./core";
import { renderTree } from "./controls";
import { createDebugFolder, destroyDebugFolder } from "./inspector";
import type { DebugSchema, DebugControlsResult, FolderOptions } from "./types";

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

/**
 * Registers controls with the Three.js Inspector and returns their live state or TSL uniforms.
 *
 * The schema layout is static upon initialization, but callbacks remain synchronized with React.
 */
export function useDebugControls<const T extends DebugSchema>(
  folderName: string,
  schema: T,
  options?: FolderOptions,
): DebugControlsResult<T> {
  const [tree] = useState(() => normalizeSchema(schema));
  const [nodes] = useState(() => createNodes(tree));

  // Keep a ref of the latest schema on every render to ensure fresh closures
  const schemaRef = useRef(schema);
  schemaRef.current = schema;

  // Bind to DOM Inspector
  useEffect(() => {
    const rootFolder = createDebugFolder(folderName);
    if (options?.collapsed) rootFolder.close();

    renderTree(rootFolder, tree, nodes as Record<string, unknown>, schemaRef);

    return () => destroyDebugFolder(rootFolder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderName]);

  return nodes as DebugControlsResult<T>;
}

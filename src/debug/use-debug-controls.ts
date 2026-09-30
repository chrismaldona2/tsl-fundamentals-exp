import { useEffect, useState } from "react";
import { normalizeSchema, syncCallbacks } from "./schema";
import { createNodes } from "./nodes";
import { renderTree } from "./controls";
import { createDebugFolder, destroyDebugFolder } from "./inspector";
import type { DebugSchema, DebugControlsResult, FolderOptions } from "./types";

export function folder<const T extends DebugSchema>(
  name: string,
  schema: T,
  options?: FolderOptions,
) {
  return { isFolderWrapper: true, name, schema, options } as const;
}

export function useDebugControls<const T extends DebugSchema>(
  folderName: string,
  schema: T,
  options?: FolderOptions,
): DebugControlsResult<T> {
  const [tree] = useState(() => normalizeSchema(schema));
  const [nodes] = useState(() => createNodes(tree));

  // Sync callbacks to prevent stale closures
  syncCallbacks(tree, schema);

  // Bind to DOM Inspector
  useEffect(() => {
    const rootFolder = createDebugFolder(folderName);
    if (options?.collapsed) rootFolder.close();

    renderTree(rootFolder, tree, nodes as Record<string, unknown>);

    return () => destroyDebugFolder(rootFolder);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderName]);

  return nodes as DebugControlsResult<T>;
}

import { Inspector } from "three/addons/inspector/Inspector.js";

export type DebugFolder = ReturnType<Inspector["createParameters"]>;

let inspector: Inspector | null = null;

export function getInspector() {
  if (!inspector) {
    inspector = new Inspector();

    if (inspector.domElement) {
      const events = [
        "pointerdown",
        "pointermove",
        "pointerup",
        "click",
        "dblclick",
        "wheel",
      ] satisfies (keyof HTMLElementEventMap)[];

      for (const eventName of events)
        inspector.domElement.addEventListener(eventName, (event) =>
          event.stopPropagation(),
        );
    }
  }
  return inspector;
}

export function createDebugFolder(name: string): DebugFolder {
  return getInspector().createParameters(name);
}

export function destroyDebugFolder(folder: DebugFolder) {
  const inst = getInspector();

  // Remove from dom
  const paramList = folder.paramList;
  if (paramList && paramList.domElement) paramList.domElement.remove();

  // Remove from internal array
  const internalInspector = inst as Inspector & {
    parameters?: { groups?: unknown[] };
  };
  const groups = internalInspector.parameters?.groups;

  if (groups) {
    const index = groups.indexOf(folder);
    if (index > -1) groups.splice(index, 1);
  }
}

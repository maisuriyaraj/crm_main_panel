// Selection rules for the permission matrix. Kept free of React so they can be
// tested directly. The API enforces the same rules (PERMISSION_DEPENDENCY,
// PERMISSION_NOT_DELEGABLE); these only keep the form from building a set the
// API would refuse.

import type { PermissionDefinition, PermissionModule } from "@/lib/team/types";

export type PermissionIndex = Map<string, PermissionDefinition>;

export const indexCatalog = (modules: PermissionModule[]): PermissionIndex =>
  new Map(modules.flatMap((group) => group.permissions.map((permission) => [permission.key, permission] as const)));

// A key plus everything it needs, transitively.
const withRequirements = (keys: Iterable<string>, index: PermissionIndex): Set<string> => {
  const out = new Set(keys);
  const stack = [...out];
  while (stack.length) {
    const key = stack.pop() as string;
    (index.get(key)?.requires ?? []).forEach((required) => {
      if (!out.has(required)) {
        out.add(required);
        stack.push(required);
      }
    });
  }
  return out;
};

// A key plus everything that needs it, transitively.
const withDependents = (key: string, index: PermissionIndex): Set<string> => {
  const out = new Set([key]);
  let changed = true;
  while (changed) {
    changed = false;
    index.forEach((permission) => {
      if (!out.has(permission.key) && permission.requires.some((required) => out.has(required))) {
        out.add(permission.key);
        changed = true;
      }
    });
  }
  return out;
};

export interface SelectionChange {
  next: Set<string>;
  // Labels of keys that changed besides the one clicked, for an inline note.
  alsoAdded: string[];
  alsoRemoved: string[];
}

export const toggleKey = (selected: Set<string>, key: string, on: boolean, index: PermissionIndex): SelectionChange => {
  const next = new Set(selected);
  const alsoAdded: string[] = [];
  const alsoRemoved: string[] = [];
  const label = (k: string) => index.get(k)?.label ?? k;

  if (index.get(key)?.reserved) return { next, alsoAdded, alsoRemoved };

  if (on) {
    withRequirements([key], index).forEach((k) => {
      if (!next.has(k) && k !== key) alsoAdded.push(label(k));
      next.add(k);
    });
  } else {
    withDependents(key, index).forEach((k) => {
      if (next.has(k) && k !== key) alsoRemoved.push(label(k));
      next.delete(k);
    });
  }

  return { next, alsoAdded, alsoRemoved };
};

export interface ModuleSelection {
  selectable: number;
  selected: number;
  state: boolean | "indeterminate";
}

// Reserved keys never count: they cannot be selected on a custom role.
export const moduleSelection = (group: PermissionModule, selected: Set<string>): ModuleSelection => {
  const selectable = group.permissions.filter((p) => !p.reserved);
  const count = selectable.filter((p) => selected.has(p.key)).length;
  return {
    selectable: selectable.length,
    selected: count,
    state: count === 0 ? false : count === selectable.length ? true : "indeterminate",
  };
};

// Select-all for one module: fills it (and whatever it needs elsewhere), or
// clears it (and whatever elsewhere needs it) when it is already full.
export const toggleModule = (group: PermissionModule, selected: Set<string>, index: PermissionIndex): Set<string> => {
  const selectable = group.permissions.filter((p) => !p.reserved).map((p) => p.key);
  const full = selectable.length > 0 && selectable.every((key) => selected.has(key));
  const next = new Set(selected);

  if (full) {
    selectable.forEach((key) => withDependents(key, index).forEach((k) => next.delete(k)));
  } else {
    withRequirements(selectable, index).forEach((k) => next.add(k));
  }
  return next;
};

// The set the form sends: catalog keys only, never reserved ones, sorted so
// equal sets compare equal.
export const toPermissionList = (selected: Set<string>, index: PermissionIndex): string[] =>
  [...selected].filter((key) => index.has(key) && !index.get(key)?.reserved).sort();

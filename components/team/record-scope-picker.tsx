"use client";

import type { RecordScope, RoleScopes, ScopedModule } from "@/lib/team/types";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export const SCOPED_MODULES: Array<{ module: ScopedModule; label: string; noun: string }> = [
  { module: "leads", label: "Leads", noun: "leads" },
  { module: "contacts", label: "Contacts", noun: "contacts" },
];

// The same rules the API applies (own / team / all), in one line each.
const SCOPE_OPTIONS: Array<{ value: RecordScope; label: string; explain: (noun: string) => string }> = [
  { value: "own", label: "Own", explain: (noun) => `Only ${noun} assigned to them, or that they created and nobody is assigned to.` },
  { value: "team", label: "Team", explain: (noun) => `${noun[0].toUpperCase()}${noun.slice(1)} assigned to anyone in their team. Without a team, the same as Own.` },
  { value: "all", label: "All", explain: (noun) => `Every ${noun.replace(/s$/, "")} in the workspace.` },
];

// A new custom role starts at Own, like the API.
export const DEFAULT_SCOPE: RecordScope = "own";

interface RecordScopePickerProps {
  // Modules whose View permission the role holds; the others have no scope.
  visibleModules: ScopedModule[];
  scopes: RoleScopes;
  onChange: (next: RoleScopes) => void;
  disabled: boolean;
}

export function RecordScopePicker({ visibleModules, scopes, onChange, disabled }: RecordScopePickerProps) {
  const shown = SCOPED_MODULES.filter(({ module }) => visibleModules.includes(module));
  if (!shown.length) return null;

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">Which records they see</h2>
        <p className="text-xs text-muted-foreground">Applies everywhere: lists, search, exports and every record they open.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {shown.map(({ module, label, noun }) => {
          const value = scopes[module] ?? DEFAULT_SCOPE;
          return (
            <fieldset key={module} className="space-y-2 rounded-lg border p-3" disabled={disabled}>
              <legend className="px-1 text-sm font-semibold">{label}</legend>
              <RadioGroup
                value={value}
                onValueChange={(next) => onChange({ ...scopes, [module]: next as RecordScope })}
                aria-label={`${label} records`}
                disabled={disabled}
              >
                {SCOPE_OPTIONS.map((option) => {
                  const id = `scope-${module}-${option.value}`;
                  return (
                    <div key={option.value} className="flex items-start gap-2">
                      <RadioGroupItem id={id} value={option.value} className="mt-0.5" />
                      <Label htmlFor={id} className="block font-normal">
                        <span className="block text-sm font-medium">{option.label}</span>
                        <span className="block text-xs text-muted-foreground">{option.explain(noun)}</span>
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            </fieldset>
          );
        })}
      </div>
    </div>
  );
}

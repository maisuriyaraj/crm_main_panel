"use client";

import type { OrgTeam } from "@/lib/team/types";
import { SelectItem } from "@/components/ui/select";

// The "no team" choice. Radix Select can't use an empty string as a value.
export const NO_TEAM = "none";

// Team options for the invite and change-team pickers.
export function TeamSelectItems({ teams }: { teams: OrgTeam[] }) {
  return (
    <>
      <SelectItem value={NO_TEAM}>No team</SelectItem>
      {teams.map((team) => (
        <SelectItem key={team.id} value={team.id}>
          {team.name}
          <span className="ml-2 text-xs text-muted-foreground">
            {team.memberCount} member{team.memberCount === 1 ? "" : "s"}
          </span>
        </SelectItem>
      ))}
    </>
  );
}

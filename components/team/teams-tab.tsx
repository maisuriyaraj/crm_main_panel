"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Crown, MoreHorizontal, Plus, UsersRound } from "lucide-react";

import { notify } from "@/lib/commonFunctions";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { reqToCreateTeam, reqToDeleteTeam, reqToUpdateTeam } from "@/lib/store/slices/teamsSlice";
import { mapTeamFieldErrors } from "@/lib/team/mappers";
import type { OrgTeam } from "@/lib/team/types";
import { useTeamFailure } from "@/hooks/useTeamFailure";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

// Mirrors the API's team name rules (2 to 100 characters, inner spaces collapsed).
const teamSchema = z.object({
  name: z
    .string()
    .transform((value) => value.trim().replace(/\s+/g, " "))
    .pipe(z.string().min(2, "Name must be at least 2 characters").max(100, "Name must be at most 100 characters")),
  description: z.string().max(255, "Description must be at most 255 characters"),
});
type TeamFormValues = z.input<typeof teamSchema>;
const API_FIELDS: Record<string, string> = { name: "name", description: "description" };
const NO_LEAD = "none";

interface TeamsTabProps {
  canManage: boolean;
  onChanged: () => void;
  onRetry: () => void;
}

// Teams group members, one team per member. A team-scope role (for example Sales
// Manager) sees the leads and contacts of everyone in its member's team.
export function TeamsTab({ canManage, onChanged, onRetry }: TeamsTabProps) {
  const { teams, isLoading, error } = useAppSelector((state) => state.teams);
  const [editing, setEditing] = useState<OrgTeam | "new" | null>(null);
  const [leading, setLeading] = useState<OrgTeam | null>(null);
  const [deleting, setDeleting] = useState<OrgTeam | null>(null);

  if (error && !teams.length) {
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
          <span>Couldn&apos;t load teams.</span>
          <Button size="sm" variant="outline" onClick={onRetry}>
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Each member can be in one team. Roles with team access see the records of everyone in their team.
        </p>
        {canManage && (
          <Button onClick={() => setEditing("new")}>
            <Plus />
            Create team
          </Button>
        )}
      </div>

      {isLoading && !teams.length ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : teams.length === 0 ? (
        <Alert>
          <UsersRound aria-hidden />
          <AlertDescription>
            No teams yet.{canManage ? " Create one, then move members into it from the Members tab or when you invite them." : ""}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {teams.map((team) => (
            <Card key={team.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
                <div className="min-w-0 space-y-1">
                  <CardTitle className="truncate text-base">{team.name}</CardTitle>
                  {team.description && <p className="text-sm text-muted-foreground">{team.description}</p>}
                </div>
                {team.allowedActions.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label={`Actions for ${team.name}`}>
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {team.allowedActions.includes("rename") && (
                        <DropdownMenuItem onSelect={() => setEditing(team)}>Rename</DropdownMenuItem>
                      )}
                      {team.allowedActions.includes("set_lead") && (
                        <DropdownMenuItem onSelect={() => setLeading(team)} disabled={team.memberCount === 0}>
                          Set team lead
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setDeleting(team)}>
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p className="flex items-center gap-1.5">
                  <Crown className="size-4 text-muted-foreground" aria-hidden />
                  Lead: {team.lead ? team.lead.fullName : <span className="text-muted-foreground">none</span>}
                </p>
                <p className="text-muted-foreground tabular-nums">
                  {team.memberCount} member{team.memberCount === 1 ? "" : "s"}
                </p>
                {team.members.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {team.members.map((member) => (
                      <Badge key={member.id} variant={member.status === "suspended" ? "outline" : "secondary"}>
                        {member.fullName}
                        {member.status === "suspended" ? " (suspended)" : ""}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Each dialog mounts fresh per team, so its state starts from that team. */}
      {editing && (
        <TeamFormDialog key={editing === "new" ? "new" : editing.id} team={editing} onClose={() => setEditing(null)} onSaved={onChanged} />
      )}
      {leading && <TeamLeadDialog key={leading.id} team={leading} onClose={() => setLeading(null)} onSaved={onChanged} />}
      {deleting && <DeleteTeamDialog key={deleting.id} team={deleting} onClose={() => setDeleting(null)} onDeleted={onChanged} />}
    </div>
  );
}

function TeamFormDialog({ team, onClose, onSaved }: { team: OrgTeam | "new"; onClose: () => void; onSaved: () => void }) {
  const dispatch = useAppDispatch();
  const handleFailure = useTeamFailure();
  const isSaving = useAppSelector((state) => state.teams.isSaving);
  const [banner, setBanner] = useState<string | null>(null);
  const isNew = team === "new";
  const existing = team !== "new" ? team : null;

  const form = useForm<TeamFormValues>({
    resolver: zodResolver(teamSchema),
    defaultValues: { name: existing?.name ?? "", description: existing?.description ?? "" },
  });

  const onFailure = (error: unknown) => {
    const apiError = handleFailure(error, isNew ? "Couldn't create the team." : "Couldn't save the team.");
    if (!apiError) return;
    const fieldErrors = mapTeamFieldErrors(apiError.errors, API_FIELDS);
    if (fieldErrors.length) {
      fieldErrors.forEach(({ field, message }) => form.setError(field as keyof TeamFormValues, { message }));
      return;
    }
    if (apiError.code === "TEAM_NAME_TAKEN") {
      form.setError("name", { message: "A team with this name already exists." });
      return;
    }
    setBanner(apiError.message);
  };

  const onSubmit = (raw: TeamFormValues) => {
    const values = teamSchema.parse(raw);
    const description = values.description.trim() ? values.description.trim() : null;
    const done = (message: string) => () => {
      notify(message, { type: "success" });
      onSaved();
      onClose();
    };
    if (isNew) {
      dispatch(reqToCreateTeam({ data: { name: values.name, description }, onSuccess: done("Team created."), onFailure }));
    } else if (existing) {
      dispatch(reqToUpdateTeam({ data: { id: existing.id, name: values.name, description }, onSuccess: done("Team saved."), onFailure }));
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isNew ? "Create team" : "Rename team"}</DialogTitle>
          <DialogDescription>Team names are unique in your workspace.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {banner && (
              <Alert variant="destructive">
                <AlertDescription>{banner}</AlertDescription>
              </Alert>
            )}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} maxLength={100} autoComplete="off" placeholder="North sales" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} maxLength={255} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : isNew ? "Create team" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function TeamLeadDialog({ team, onClose, onSaved }: { team: OrgTeam; onClose: () => void; onSaved: () => void }) {
  const dispatch = useAppDispatch();
  const handleFailure = useTeamFailure();
  const isSaving = useAppSelector((state) => state.teams.isSaving);
  const [leadId, setLeadId] = useState(team.lead?.id ?? NO_LEAD);
  const [error, setError] = useState<string | null>(null);

  // Only active members can lead; the API refuses anyone else.
  const candidates = team.members.filter((member) => member.status === "active");

  const save = () => {
    dispatch(
      reqToUpdateTeam({
        data: { id: team.id, leadUserId: leadId === NO_LEAD ? null : leadId },
        onSuccess: () => {
          notify("Team lead saved.", { type: "success" });
          onSaved();
          onClose();
        },
        onFailure: (failure: unknown) => {
          const apiError = handleFailure(failure, "Couldn't set the team lead.");
          if (apiError) setError(apiError.code === "LEAD_NOT_IN_TEAM" ? "The lead must be an active member of this team." : apiError.message);
        },
      }),
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set team lead</DialogTitle>
          <DialogDescription>Choose one of {team.name}&apos;s active members.</DialogDescription>
        </DialogHeader>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-2">
          <Label htmlFor="team-lead">Team lead</Label>
          <Select value={leadId} onValueChange={setLeadId}>
            <SelectTrigger id="team-lead">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_LEAD}>No lead</SelectItem>
              {candidates.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.fullName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={isSaving || leadId === (team.lead?.id ?? NO_LEAD)}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// A team with members can't be deleted: the dialog says so instead of offering
// a button the API would refuse. The API also blocks a team with pending
// invitations or lead assignment rules, and its message names them.
function DeleteTeamDialog({ team, onClose, onDeleted }: { team: OrgTeam; onClose: () => void; onDeleted: () => void }) {
  const dispatch = useAppDispatch();
  const handleFailure = useTeamFailure();
  const isSaving = useAppSelector((state) => state.teams.isSaving);
  const [error, setError] = useState<string | null>(null);

  const blocked = team.memberCount > 0;

  const remove = () => {
    dispatch(
      reqToDeleteTeam({
        data: { id: team.id },
        onSuccess: () => {
          notify("Team deleted.", { type: "success" });
          onDeleted();
          onClose();
        },
        onFailure: (failure: unknown) => {
          const apiError = handleFailure(failure, "Couldn't delete the team.");
          if (apiError) setError(apiError.message);
        },
      }),
    );
  };

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{blocked ? `${team.name} still has members` : `Delete ${team.name}?`}</AlertDialogTitle>
          <AlertDialogDescription>
            {blocked
              ? `Move its ${team.memberCount} member${team.memberCount === 1 ? "" : "s"} to another team, or to no team, from the Members tab first. Only an empty team can be deleted.`
              : "The team is removed. Nobody's role changes."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>{blocked ? "Close" : "Cancel"}</AlertDialogCancel>
          {!blocked && (
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                remove();
              }}
              disabled={isSaving}
            >
              {isSaving ? "Deleting..." : "Delete team"}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

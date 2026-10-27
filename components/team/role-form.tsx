"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { notify } from "@/lib/commonFunctions";
import { indexCatalog, toPermissionList, type SelectionChange } from "@/lib/roles/matrix";
import { normalizeRoleName, roleFormSchema, type RoleFormValues } from "@/lib/roles/schema";
import { mapTeamFieldErrors } from "@/lib/team/mappers";
import type { PermissionModule, TeamApiError, TeamRoleDetail } from "@/lib/team/types";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { reqToCreateTeamRole, reqToUpdateTeamRole } from "@/lib/store/slices/teamRolesSlice";
import { useTeamFailure } from "@/hooks/useTeamFailure";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PermissionMatrix } from "@/components/team/permission-matrix";

const API_FIELDS: Record<string, string> = { name: "name", description: "description" };

// Render with a `key` of the role id and version (see roleFormKey): a reload
// or a different role then starts a fresh form from the server's copy.
export const roleFormKey = (role?: TeamRoleDetail | null, source?: TeamRoleDetail | null) =>
  `${role?.id ?? "new"}:${role?.version ?? 0}:${source?.id ?? ""}`;

interface RoleFormProps {
  modules: PermissionModule[];
  // The role being edited or viewed. Absent when creating.
  role?: TeamRoleDetail | null;
  // Prefills a new role (Duplicate). Ignored when `role` is given.
  source?: TeamRoleDetail | null;
  readOnly: boolean;
  onSaved: (role: TeamRoleDetail) => void;
  onCancel: () => void;
  onReload?: () => void;
  onDuplicate?: () => void;
}

type Banner = { kind: "conflict" } | { kind: "error"; error: TeamApiError };

const initialValues = (role?: TeamRoleDetail | null, source?: TeamRoleDetail | null): RoleFormValues => {
  if (role) return { name: role.name, description: role.description ?? "" };
  if (source) return { name: `${source.label} (copy)`.slice(0, 50), description: source.description ?? "" };
  return { name: "", description: "" };
};

const initialPermissions = (role?: TeamRoleDetail | null, source?: TeamRoleDetail | null) =>
  new Set(role?.permissions ?? source?.permissions ?? []);

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((key, i) => key === b[i]);

export function RoleForm({ modules, role, source, readOnly, onSaved, onCancel, onReload, onDuplicate }: RoleFormProps) {
  const dispatch = useAppDispatch();
  const handleFailure = useTeamFailure();
  const isSaving = useAppSelector((state) => state.teamRoles.isSaving);
  const index = useMemo(() => indexCatalog(modules), [modules]);

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: initialValues(role, source),
  });
  const [selected, setSelected] = useState<Set<string>>(() => initialPermissions(role, source));
  const [note, setNote] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const permissionList = toPermissionList(selected, index);
  const startingList = toPermissionList(initialPermissions(role, source), index);
  const isDirty = !readOnly && (form.formState.isDirty || !sameSet(permissionList, startingList) || (!role && !!source));

  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const onMatrixChange = ({ next, alsoAdded, alsoRemoved }: SelectionChange) => {
    setSelected(next);
    setBanner(null);
    if (alsoAdded.length) setNote(`Also ticked ${alsoAdded.join(", ")}, which the permission you picked needs.`);
    else if (alsoRemoved.length) setNote(`Also removed ${alsoRemoved.join(", ")}, which can't work without it.`);
    else setNote(null);
  };

  const onFailure = (error: unknown) => {
    const apiError = handleFailure(error, "Couldn't save the role. Try again.");
    if (!apiError) return;

    const fieldErrors = mapTeamFieldErrors(apiError.errors, API_FIELDS);
    if (fieldErrors.length) {
      fieldErrors.forEach(({ field, message }) => form.setError(field as keyof RoleFormValues, { message }));
      return;
    }
    if (apiError.code === "ROLE_NAME_TAKEN") {
      form.setError("name", { message: apiError.message });
      return;
    }
    if (apiError.code === "VERSION_CONFLICT") {
      setBanner({ kind: "conflict" });
      return;
    }
    setBanner({ kind: "error", error: apiError });
  };

  const onSubmit = (values: RoleFormValues) => {
    setBanner(null);
    const input = {
      name: normalizeRoleName(values.name),
      description: values.description.trim() || null,
      permissions: permissionList,
    };

    const done = (saved: TeamRoleDetail) => {
      notify(role ? "Role saved." : `Role "${saved.name}" created.`, { type: "success" });
      onSaved(saved);
    };

    if (role) {
      dispatch(reqToUpdateTeamRole({ data: { id: role.id, version: role.version, ...input }, onSuccess: done, onFailure }));
    } else {
      dispatch(reqToCreateTeamRole({ data: input, onSuccess: done, onFailure }));
    }
  };

  const cancel = () => (isDirty ? setConfirmLeave(true) : onCancel());

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
        {role?.isSystem && (
          <Alert>
            <AlertTitle>Built-in roles can&apos;t be changed</AlertTitle>
            <AlertDescription>
              Duplicate it to start a custom role with the same permissions.
            </AlertDescription>
          </Alert>
        )}
        {readOnly && role && !role.isSystem && (
          <Alert>
            <AlertDescription>You can see this role but not change it.</AlertDescription>
          </Alert>
        )}
        {!readOnly && role && role.memberCount > 0 && (
          <Alert>
            <AlertDescription>
              {role.memberCount} {role.memberCount === 1 ? "member uses" : "members use"} this role. Changes apply to them on
              their next action; nobody needs to sign in again.
            </AlertDescription>
          </Alert>
        )}
        {banner?.kind === "conflict" && (
          <Alert variant="destructive">
            <AlertTitle>This role was changed by someone else</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>Your choices are still on screen. Reload to see the latest version, then make your changes again.</p>
              {onReload && (
                <Button type="button" size="sm" variant="outline" onClick={onReload}>
                  Reload role
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}
        {banner?.kind === "error" && (
          <Alert variant="destructive">
            <AlertDescription>{banner.error.message}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role name</FormLabel>
                <FormControl>
                  <Input {...field} maxLength={60} autoComplete="off" disabled={readOnly} />
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
                <FormLabel>
                  Description <span className="font-normal text-muted-foreground">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Textarea {...field} rows={1} maxLength={255} disabled={readOnly} className="min-h-9" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-base font-semibold">
              Permissions <span className="text-sm font-normal text-muted-foreground">· {permissionList.length} selected</span>
            </h2>
            {!readOnly && (
              <p className="text-xs text-muted-foreground">Picking an action also picks the View permission it needs.</p>
            )}
          </div>
          {note && <p className="text-sm text-muted-foreground" role="status">{note}</p>}
          {!readOnly && permissionList.length === 0 && (
            <Alert>
              <AlertDescription>
                No permissions selected. People with this role can sign in but won&apos;t see any module.
              </AlertDescription>
            </Alert>
          )}
          <PermissionMatrix modules={modules} selected={selected} onChange={onMatrixChange} disabled={readOnly} />
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={cancel}>
            {readOnly ? "Back" : "Cancel"}
          </Button>
          {readOnly && onDuplicate && (
            <Button type="button" variant="outline" onClick={onDuplicate}>
              Duplicate as custom role
            </Button>
          )}
          {!readOnly && (
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : role ? "Save role" : "Create role"}
            </Button>
          )}
        </div>
      </form>

      <AlertDialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard your changes?</AlertDialogTitle>
            <AlertDialogDescription>Nothing has been saved yet.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction onClick={onCancel}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Form>
  );
}

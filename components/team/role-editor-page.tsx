"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { buildOrgRoute, pageRoutes } from "@/lib/constants";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { reqToGetPermissionCatalog } from "@/lib/store/slices/permissionCatalogSlice";
import { clearTeamRoleDetail, reqToGetTeamRole } from "@/lib/store/slices/teamRolesSlice";
import { useAuth } from "@/hooks/useAuth";
import { useTeamFailure } from "@/hooks/useTeamFailure";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RoleForm, roleFormKey } from "@/components/team/role-form";

interface RoleEditorPageProps {
  // Editing or viewing an existing role.
  roleId?: string;
  // Creating a role prefilled from this one (Duplicate).
  fromRoleId?: string;
}

// Shared by /settings/team/roles/new and /settings/team/roles/[roleId].
// Hiding links doesn't stop someone opening these URLs, so each state that
// the API would refuse is explained here instead of showing a broken form.
export function RoleEditorPage({ roleId, fromRoleId }: RoleEditorPageProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const handleFailure = useTeamFailure();
  const params = useParams<{ orgnization: string }>();
  const { user, can } = useAuth();
  const catalog = useAppSelector((state) => state.permissionCatalog);
  const { detail, isDetailLoading, detailError } = useAppSelector((state) => state.teamRoles);

  const orgSlug = params?.orgnization ?? "";
  const rolesTabHref = `${buildOrgRoute(orgSlug, pageRoutes.settingsTeam)}?tab=roles`;
  const canView = can("team.view");
  const canManage = can("roles.manage");
  const isNew = !roleId;
  const loadId = roleId ?? fromRoleId;

  const loadCatalog = () => dispatch(reqToGetPermissionCatalog({ data: null, onFailure: (error: unknown) => handleFailure(error, "") }));
  const loadRole = () => {
    if (loadId) dispatch(reqToGetTeamRole({ data: { id: loadId }, onFailure: (error: unknown) => handleFailure(error, "") }));
  };

  useEffect(() => {
    if (!canView) return;
    if (!catalog.modules.length && !catalog.isLoading) loadCatalog();
    // Load once per page; retries go through the buttons below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView]);

  useEffect(() => {
    if (!canView) return;
    dispatch(clearTeamRoleDetail());
    loadRole();
    return () => {
      dispatch(clearTeamRoleDetail());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView, loadId]);

  if (!user) return null;

  const back = (
    <Link href={rolesTabHref} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ChevronLeft className="size-4" />
      Roles
    </Link>
  );

  if (!canView || (isNew && !canManage)) {
    return (
      <div className="space-y-4">
        {back}
        <Alert>
          <AlertTitle>{canView ? "You can't create roles" : "You don't have access to Team settings"}</AlertTitle>
          <AlertDescription>Ask an owner or admin if you need this.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (detailError?.status === 404 || detailError?.code === "NOT_FOUND") {
    return (
      <div className="space-y-4">
        {back}
        <Alert>
          <AlertTitle>This role no longer exists</AlertTitle>
          <AlertDescription>It may have been deleted. Go back to the role list to see the current roles.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const failed = catalog.error || (detailError && detailError.status !== 404);
  if (failed) {
    return (
      <div className="space-y-4">
        {back}
        <Alert variant="destructive">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>Couldn&apos;t load {catalog.error ? "the permission list" : "the role"}. Check your connection and try again.</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (catalog.error) loadCatalog();
                if (detailError) loadRole();
              }}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const loading = !catalog.modules.length || (!!loadId && (isDetailLoading || !detail || detail.id !== loadId));
  const role = isNew ? null : detail;
  const source = isNew && fromRoleId ? detail : null;
  const readOnly = !!role && (role.isSystem || !role.editable);
  const title = isNew ? (source ? `Duplicate ${source.label}` : "Create role") : readOnly ? role?.label ?? "Role" : `Edit ${role?.label ?? "role"}`;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        {back}
        <h1 className="text-2xl font-bold">{loading ? "Role" : title}</h1>
        {!loading && role?.createdBy && (
          <p className="text-sm text-muted-foreground">Created by {role.createdBy.fullName}</p>
        )}
      </div>

      {loading ? (
        <div className="space-y-4" aria-busy="true">
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
          </div>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <RoleForm
          key={roleFormKey(role, source)}
          modules={catalog.modules}
          role={role}
          source={source}
          readOnly={readOnly}
          onSaved={() => router.push(rolesTabHref)}
          onCancel={() => router.push(rolesTabHref)}
          onReload={loadRole}
          onDuplicate={
            canManage && role
              ? () => router.push(`${buildOrgRoute(orgSlug, pageRoutes.settingsTeamRoleNew)}?from=${encodeURIComponent(role.id)}`)
              : undefined
          }
        />
      )}
    </div>
  );
}

"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

import { buildOrgRoute, pageRoutes } from "@/lib/constants";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { reqToGetTeamRoles } from "@/lib/store/slices/teamRolesSlice";
import { useAuth } from "@/hooks/useAuth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MembersTab } from "@/components/team/members-tab";
import { InvitationsTab } from "@/components/team/invitations-tab";
import { ActivityTab } from "@/components/team/activity-tab";
import { InviteMemberDialog } from "@/components/team/invite-member-dialog";

type TeamTab = "members" | "invitations" | "activity";

export default function TeamSettingsPage() {
  return (
    <Suspense fallback={null}>
      <TeamSettings />
    </Suspense>
  );
}

function TeamSettings() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useParams<{ orgnization: string }>();
  const { user, can } = useAuth();
  const summary = useAppSelector((state) => state.orgUsers.summary);

  const canView = can("team.view");
  const canInvite = can("team.invite");
  const canViewAudit = can("team.audit.view");
  const orgName = user?.organizationName || "your organization";
  const orgInactive = !!user?.organizationStatus && user.organizationStatus !== "active";

  const requestedTab = searchParams.get("tab");
  const tab: TeamTab =
    requestedTab === "invitations" || (requestedTab === "activity" && canViewAudit) ? requestedTab : "members";

  // Bumped after every change so each tab and the summary reload.
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const [inviteOpen, setInviteOpen] = useState(false);

  useEffect(() => {
    if (canView) dispatch(reqToGetTeamRoles({ data: null }));
  }, [dispatch, canView]);

  // The tab lives in the query string so links and reloads keep it.
  const setTab = (next: string) => {
    const query = new URLSearchParams(searchParams.toString());
    if (next === "members") query.delete("tab");
    else query.set("tab", next);
    const qs = query.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  if (!user) return null;

  // Hiding the nav entry doesn't stop someone opening the URL; this explains
  // instead of showing a blank page, and fires no Team request.
  if (!canView) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Team</h1>
        <Alert>
          <AlertTitle>You don&apos;t have access to Team settings</AlertTitle>
          <AlertDescription>
            Ask an owner or admin if you need to manage teammates.{" "}
            <Link className="underline" href={buildOrgRoute(params?.orgnization ?? "", pageRoutes.dashboard)}>
              Go to dashboard
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const seatsLimit = summary?.seatsLimit ?? null;
  const seatsUsed = summary?.seatsUsed ?? 0;
  const seatsFull = seatsLimit !== null && seatsUsed >= seatsLimit;
  const overLimit = seatsLimit !== null && seatsUsed > seatsLimit;
  const memberCount = summary ? summary.active + summary.suspended : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div>
            <h1 className="text-2xl font-bold">Team</h1>
            <p className="text-muted-foreground">Manage who has access to {orgName}.</p>
          </div>
          {summary && (
            <div className="max-w-xs space-y-1.5">
              <p className="text-sm text-muted-foreground">
                {seatsLimit !== null ? `${seatsUsed} of ${seatsLimit} seats used` : `${seatsUsed} seats used`}
                {summary.pendingInvitations > 0 &&
                  ` · ${summary.pendingInvitations} pending invitation${summary.pendingInvitations === 1 ? "" : "s"}`}
              </p>
              {seatsLimit !== null && seatsLimit > 0 && (
                <Progress value={Math.min(100, (seatsUsed / seatsLimit) * 100)} className="h-1.5" />
              )}
            </div>
          )}
        </div>

        {canInvite && (
          <Button onClick={() => setInviteOpen(true)} disabled={orgInactive}>
            <Plus />
            <span className="hidden sm:inline">Invite member</span>
            <span className="sm:hidden">Invite</span>
          </Button>
        )}
      </div>

      {orgInactive && (
        <Alert variant="destructive">
          <AlertDescription>This workspace is suspended. Team changes are disabled.</AlertDescription>
        </Alert>
      )}

      {overLimit && (
        <Alert>
          <AlertTitle>Over seat limit</AlertTitle>
          <AlertDescription>
            Your team uses {seatsUsed} of {seatsLimit} seats. Existing members keep their access, but new invitations and
            reactivations are blocked until you remove members or add seats.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="max-w-full overflow-x-auto">
          <TabsTrigger value="members">Members{memberCount !== null ? ` (${memberCount})` : ""}</TabsTrigger>
          <TabsTrigger value="invitations">
            Invitations{summary ? ` (${summary.pendingInvitations})` : ""}
          </TabsTrigger>
          {canViewAudit && <TabsTrigger value="activity">Activity</TabsTrigger>}
        </TabsList>

        {/* Stays mounted on other tabs: its list request also supplies the
            seat summary shown in the header. */}
        <TabsContent value="members" forceMount className="mt-4 data-[state=inactive]:hidden">
          <MembersTab
            orgName={orgName}
            version={version}
            canInvite={canInvite}
            onInvite={() => setInviteOpen(true)}
            onChanged={refresh}
          />
        </TabsContent>
        <TabsContent value="invitations" className="mt-4">
          <InvitationsTab version={version} canInvite={canInvite} onInvite={() => setInviteOpen(true)} onChanged={refresh} />
        </TabsContent>
        {canViewAudit && (
          <TabsContent value="activity" className="mt-4">
            <ActivityTab version={version} />
          </TabsContent>
        )}
      </Tabs>

      {canInvite && (
        <InviteMemberDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          seatsFull={seatsFull}
          seatsLimit={seatsLimit}
          onInvited={refresh}
        />
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Check, Rocket } from "lucide-react";

import { buildOrgRoute, pageRoutes } from "@/lib/constants";
import { apiErrorMessage } from "@/lib/auth/errors";
import { notify } from "@/lib/commonFunctions";
import { deferSetup } from "@/lib/onboarding";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { reqToRefreshProfile } from "@/lib/store/slices/authSlice";
import { reqToGetTeamRoles } from "@/lib/store/slices/teamRolesSlice";
import {
  reqToCompleteOnboarding,
  reqToGetOnboarding,
  reqToSaveOnboardingCompany,
  reqToSaveOnboardingLocale,
  reqToSkipOnboardingStep,
  reqToUploadOnboardingLogo,
  type CompanyInput,
  type OnboardingStepKey,
} from "@/lib/store/slices/onboardingSlice";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { NoAccess } from "@/components/auth/no-access";
import { StepAlert } from "@/components/auth/mfa/code-form";
import { InviteMemberDialog } from "@/components/team/invite-member-dialog";
import { CompanyStep } from "./company-step";
import { AdAccountsStep, InviteStep, LocaleStep, LogoStep } from "./other-steps";
import { callbackMessage } from "@/components/integrations/ad-integrations-panel";
import { Alert, AlertDescription } from "@/components/ui/alert";

const STEP_TITLES: Record<OnboardingStepKey, { title: string; intro: string }> = {
  company: { title: "Company details", intro: "Your company's name, address and contact details." },
  logo: { title: "Logo", intro: "Shown in the sidebar for everyone on your team." },
  locale: { title: "Currency and time zone", intro: "The currency your business works in, and your local time." },
  invite_team: { title: "Invite your team", intro: "Bring in the people who'll work in OrbitOps with you." },
  ad_accounts: { title: "Connect ad accounts", intro: "Bring in leads and results from your ad platforms." },
};

// The first-login setup, for Owners and Admins (organization.settings.manage) until
// it is finished. Every step can be skipped and come back to; progress is saved on
// the server, so another admin, or this one after a reload, carries on from there.
export function SetupWizard() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const params = useParams<{ orgnization: string }>();
  const { can } = useAuth();
  const { state, isLoading, isSaving, error: loadError } = useAppSelector((root) => root.onboarding);
  const canManage = can("organization.settings.manage");
  const search = useSearchParams();
  // Back from Meta or Google: the result is in the URL, and the wizard reopens that step.
  const connectResult = callbackMessage(search);
  const [index, setIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const dashboard = buildOrgRoute(params?.orgnization ?? "", pageRoutes.dashboard);

  useEffect(() => {
    if (!canManage) return;
    dispatch(reqToGetOnboarding({ data: null }));
    if (can("team.view")) dispatch(reqToGetTeamRoles({ data: null }));
    // Loaded once per visit; every save answers the fresh state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, canManage]);

  if (!canManage) return <NoAccess title="Set up your workspace" area="workspace setup" />;

  if (!state) {
    return loadError && !isLoading ? (
      <div className="mx-auto max-w-3xl space-y-4">
        <StepAlert message={loadError} />
        <Button onClick={() => dispatch(reqToGetOnboarding({ data: null }))}>Try again</Button>
      </div>
    ) : (
      <div className="mx-auto max-w-3xl space-y-4" aria-busy="true">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const steps = state.steps;
  const adsStep = steps.findIndex((entry) => entry.key === "ad_accounts");
  const startAt = connectResult && adsStep >= 0 ? adsStep : Math.max(0, steps.findIndex((entry) => entry.key === state.current_step));
  const current = index ?? (state.completed ? 0 : startAt);
  const step = steps[current];
  const isLast = current === steps.length - 1;
  const statusOf = (key: OnboardingStepKey) => steps.find((entry) => entry.key === key)?.status;
  const canSkip = !state.completed && step.status === "pending";

  const go = (next: number) => {
    setError(null);
    setIndex(Math.min(Math.max(next, 0), steps.length - 1));
  };
  const next = () => go(current + 1);
  const back = current > 0 ? () => go(current - 1) : undefined;

  const fail = (failure: unknown, fallback: string) => {
    setError(apiErrorMessage(failure, fallback));
    return failure;
  };

  const skip = async () => {
    if (!canSkip) return next();
    const action = await dispatch(reqToSkipOnboardingStep({ data: { step: step.key }, onFailure: (failure) => fail(failure, "Couldn't skip this step.") }));
    if (reqToSkipOnboardingStep.fulfilled.match(action)) next();
  };

  const finish = async () => {
    setError(null);
    if (state.completed) {
      router.push(dashboard);
      return;
    }
    const action = await dispatch(reqToCompleteOnboarding({
      data: null,
      onFailure: (failure) => fail(failure, "Couldn't finish the setup."),
    }));
    if (reqToCompleteOnboarding.fulfilled.match(action)) {
      await dispatch(reqToRefreshProfile({ data: null }));
      notify("Your workspace is set up.", { type: "success" });
      router.push(dashboard);
    }
  };

  // Leaves the wizard for this session; a banner offers it again until it is finished.
  const later = () => {
    deferSetup();
    router.push(dashboard);
  };

  const saveCompany = async (input: CompanyInput) => {
    setError(null);
    let failure: unknown = null;
    const action = await dispatch(reqToSaveOnboardingCompany({ data: input, onFailure: (e) => { failure = fail(e, "Couldn't save the company details."); } }));
    if (reqToSaveOnboardingCompany.fulfilled.match(action)) {
      // The company name shows in menus; /me carries it.
      dispatch(reqToRefreshProfile({ data: null }));
      next();
      return null;
    }
    return failure;
  };

  const uploadLogo = async (file: File) => {
    setError(null);
    const action = await dispatch(reqToUploadOnboardingLogo({ data: { file }, onFailure: (e) => fail(e, "Couldn't upload the logo.") }));
    if (reqToUploadOnboardingLogo.fulfilled.match(action)) {
      notify("Logo saved.", { type: "success" });
      return true;
    }
    return false;
  };

  const saveLocale = async (input: { currency: string; timezone: string }) => {
    setError(null);
    const action = await dispatch(reqToSaveOnboardingLocale({ data: input, onFailure: (e) => fail(e, "Couldn't save the currency and time zone.") }));
    if (reqToSaveOnboardingLocale.fulfilled.match(action)) next();
  };

  const seatsLimit = state.values.invite_team.seats_limit;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Rocket className="size-6 text-primary" aria-hidden /> Set up your workspace</h1>
          <p className="mt-1 text-muted-foreground">
            {state.completed ? "Setup is finished. You can still change these details here." : "A few details to get your team started. Skip anything and come back to it later."}
          </p>
        </div>
        {!state.completed && <Button variant="ghost" onClick={later}>Set up later</Button>}
      </div>

      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <ol className="flex gap-2 overflow-x-auto md:flex-col" aria-label="Setup steps">
          {steps.map((entry, position) => (
            <li key={entry.key}>
              <button
                type="button"
                onClick={() => go(position)}
                aria-current={position === current ? "step" : undefined}
                className={cn(
                  "flex w-full items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-left text-sm transition hover:bg-muted",
                  position === current && "bg-muted font-semibold",
                )}
              >
                <span
                  className={cn(
                    "grid size-6 shrink-0 place-items-center rounded-full border border-border text-xs",
                    entry.status === "done" && "border-primary bg-primary text-primary-foreground",
                  )}
                  aria-hidden
                >
                  {entry.status === "done" ? <Check className="size-3.5" /> : position + 1}
                </span>
                <span>{STEP_TITLES[entry.key].title}</span>
                <span className="sr-only">
                  {entry.status === "done" ? "(done)" : entry.status === "skipped" ? "(skipped)" : entry.status === "not_available" ? "(coming soon)" : ""}
                </span>
                {entry.status === "skipped" && <span className="ml-auto text-xs text-muted-foreground" aria-hidden>Skipped</span>}
                {entry.status === "not_available" && <span className="ml-auto text-xs text-muted-foreground" aria-hidden>Soon</span>}
              </button>
            </li>
          ))}
        </ol>

        <Card>
          <CardContent className="space-y-5 p-6">
            <div>
              <h2 className="text-lg font-semibold">{STEP_TITLES[step.key].title}</h2>
              <p className="text-sm text-muted-foreground">{STEP_TITLES[step.key].intro}</p>
            </div>

            {step.key === "company" && (
              <CompanyStep company={state.values.company} isSaving={isSaving} error={error} onSave={saveCompany} onSkip={skip} onBack={back} canSkip={canSkip} />
            )}
            {step.key === "logo" && (
              <LogoStep logo={state.values.logo} isSaving={isSaving} error={error} onUpload={uploadLogo} onSkip={skip} onBack={() => go(current - 1)} onContinue={next} canSkip={canSkip} />
            )}
            {step.key === "locale" && (
              <LocaleStep locale={state.values.locale} isSaving={isSaving} error={error} onSave={saveLocale} onSkip={skip} onBack={() => go(current - 1)} canSkip={canSkip} />
            )}
            {step.key === "invite_team" && (
              <InviteStep
                invite={state.values.invite_team}
                canInvite={can("team.invite")}
                isSaving={isSaving}
                error={error}
                onInvite={() => setInviteOpen(true)}
                onSkip={skip}
                onBack={() => go(current - 1)}
                onContinue={next}
                canSkip={canSkip}
                done={statusOf("invite_team") === "done"}
              />
            )}
            {step.key === "ad_accounts" && (
              <>
                {connectResult && (
                  <Alert variant={connectResult.ok ? "default" : "destructive"} role="status">
                    <AlertDescription>{connectResult.text}</AlertDescription>
                  </Alert>
                )}
                <AdAccountsStep
                  available={state.values.ad_accounts.available}
                  reason={state.values.ad_accounts.reason}
                  isSaving={isSaving}
                  error={error}
                  onBack={() => go(current - 1)}
                  onSkip={isLast ? finish : skip}
                  onNext={isLast ? finish : next}
                  nextLabel={state.completed ? "Back to dashboard" : isLast ? "Finish setup" : "Continue"}
                  canSkip={canSkip}
                />
              </>
            )}

            {!isLast && !state.completed && (
              <div className="flex justify-end">
                <Button variant="link" className="px-0" onClick={finish} disabled={isSaving}>Finish setup now</Button>
              </div>
            )}
            {isLast && error && <StepAlert message={error} />}
          </CardContent>
        </Card>
      </div>

      {inviteOpen && (
        <InviteMemberDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          seatsFull={seatsLimit !== null && state.values.invite_team.seats_used >= seatsLimit}
          seatsLimit={seatsLimit}
          // The step counts as done once an invitation is sent; the state says so.
          onInvited={() => dispatch(reqToGetOnboarding({ data: null }))}
        />
      )}
    </div>
  );
}

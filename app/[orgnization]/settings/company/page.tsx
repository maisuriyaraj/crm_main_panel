"use client";

import { useEffect, useState } from "react";
import { Building2, CalendarClock, Image as ImageIcon } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { apiErrorMessage } from "@/lib/auth/errors";
import { notify } from "@/lib/commonFunctions";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { reqToRefreshProfile } from "@/lib/store/slices/authSlice";
import type { CompanyInput, LocaleInput } from "@/lib/store/slices/onboardingSlice";
import {
  reqToGetOrgSettings,
  reqToSaveCompanySettings,
  reqToSaveLocaleSettings,
  reqToUploadOrgLogo,
} from "@/lib/store/slices/orgSettingsSlice";
import { NoAccess } from "@/components/auth/no-access";
import { StepAlert } from "@/components/auth/mfa/code-form";
import { CompanyStep } from "@/components/onboarding/company-step";
import { LocaleStep, LogoStep } from "@/components/onboarding/other-steps";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// The company profile, editable any time after setup. These are the same three
// forms the setup wizard shows, against the same API and the same fields, so a
// detail entered during setup and one changed here are the same detail — only the
// wizard's Skip and Back are gone.
export default function CompanySettingsPage() {
  const dispatch = useAppDispatch();
  const { can } = useAuth();
  const { settings, isLoaded, isLoading, isSaving, error: loadError } = useAppSelector((state) => state.orgSettings);
  const [error, setError] = useState<string | null>(null);
  const canManage = can("organization.settings.manage");

  useEffect(() => {
    if (canManage) dispatch(reqToGetOrgSettings({ data: null }));
  }, [dispatch, canManage]);

  // Fires no request without the permission, so a typed-in URL costs nothing.
  if (!canManage) {
    return <NoAccess title="Company settings" area="company settings" />;
  }

  const fail = (failure: unknown, fallback: string) => {
    setError(apiErrorMessage(failure, fallback));
    return failure;
  };

  const saveCompany = async (input: CompanyInput) => {
    setError(null);
    let failure: unknown = null;
    const action = await dispatch(reqToSaveCompanySettings({
      data: input,
      onFailure: (e) => { failure = fail(e, "Couldn't save the company details."); },
    }));
    if (reqToSaveCompanySettings.fulfilled.match(action)) {
      // The company name shows in the sidebar and menus; /me carries it.
      dispatch(reqToRefreshProfile({ data: null }));
      notify("Company details saved.", { type: "success" });
      return null;
    }
    return failure;
  };

  const saveLocale = async (input: LocaleInput) => {
    setError(null);
    const action = await dispatch(reqToSaveLocaleSettings({
      data: input,
      onFailure: (e) => fail(e, "Couldn't save the currency, time zone and date format."),
    }));
    if (reqToSaveLocaleSettings.fulfilled.match(action)) {
      notify("Currency, time zone and date format saved.", { type: "success" });
    }
  };

  const uploadLogo = async (file: File) => {
    setError(null);
    const action = await dispatch(reqToUploadOrgLogo({ data: { file }, onFailure: (e) => fail(e, "Couldn't upload the logo.") }));
    if (reqToUploadOrgLogo.fulfilled.match(action)) {
      dispatch(reqToRefreshProfile({ data: null }));
      notify("Logo saved.", { type: "success" });
      return true;
    }
    return false;
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Building2 className="size-6 text-primary" aria-hidden /> Company settings
        </h1>
        <p className="mt-1 text-muted-foreground">
          Your company&apos;s details, logo and the way your workspace shows money and dates.
        </p>
      </div>

      {!settings ? (
        loadError && !isLoading ? (
          <div className="space-y-4">
            <StepAlert message={loadError} />
            <Button onClick={() => dispatch(reqToGetOrgSettings({ data: null }))}>Try again</Button>
          </div>
        ) : (
          <div className="space-y-4" aria-busy="true">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-64 w-full" />
          </div>
        )
      ) : (
        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">
              <Building2 className="size-4" aria-hidden /> Details
            </TabsTrigger>
            <TabsTrigger value="logo">
              <ImageIcon className="size-4" aria-hidden /> Logo
            </TabsTrigger>
            <TabsTrigger value="locale">
              <CalendarClock className="size-4" aria-hidden /> Currency &amp; dates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Company details</CardTitle>
                <CardDescription>
                  The name shown across OrbitOps, your registered details and your address. Saving replaces this whole
                  section, so a box left empty is cleared.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CompanyStep
                  company={settings.company}
                  isSaving={isSaving}
                  error={error}
                  onSave={saveCompany}
                  canSkip={false}
                  submitLabel="Save changes"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logo">
            <Card>
              <CardHeader>
                <CardTitle>Logo</CardTitle>
                <CardDescription>Shown in the sidebar for everyone on your team. A new one replaces the old.</CardDescription>
              </CardHeader>
              <CardContent>
                <LogoStep logo={settings.logo} isSaving={isSaving} error={error} onUpload={uploadLogo} canSkip={false} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="locale">
            <Card>
              <CardHeader>
                <CardTitle>Currency, time zone and dates</CardTitle>
                <CardDescription>
                  The currency your business works in, your local time, and the order dates are shown in.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LocaleStep
                  locale={settings.locale}
                  isSaving={isSaving}
                  error={error}
                  onSave={saveLocale}
                  canSkip={false}
                  submitLabel="Save changes"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {isLoaded && (
        <p className="text-sm text-muted-foreground">
          Changing your plan or what OrbitOps bills you in isn&apos;t done here — see Plan &amp; usage.
        </p>
      )}
    </div>
  );
}

"use client";

import { Suspense } from "react";

import { SetupWizard } from "@/components/onboarding/setup-wizard";

// The wizard reads the result of a Meta or Google connect from the URL.
export default function SetupPage() {
  return (
    <Suspense fallback={null}>
      <SetupWizard />
    </Suspense>
  );
}

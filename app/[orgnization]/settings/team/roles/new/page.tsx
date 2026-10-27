"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { RoleEditorPage } from "@/components/team/role-editor-page";

export default function NewRolePage() {
  return (
    <Suspense fallback={null}>
      <NewRole />
    </Suspense>
  );
}

function NewRole() {
  const searchParams = useSearchParams();
  return <RoleEditorPage fromRoleId={searchParams.get("from") ?? undefined} />;
}

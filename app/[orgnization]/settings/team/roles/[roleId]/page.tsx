"use client";

import { useParams } from "next/navigation";

import { RoleEditorPage } from "@/components/team/role-editor-page";

export default function RolePage() {
  const params = useParams<{ roleId: string }>();
  return <RoleEditorPage roleId={params?.roleId} />;
}

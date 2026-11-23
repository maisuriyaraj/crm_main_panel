"use client";

import { CheckCircle2, CircleAlert, MessageCircle } from "lucide-react";

import type { AdProviderState } from "@/lib/store/slices/adIntegrationsSlice";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// The permission a Meta connection must have been granted for WhatsApp ads.
const WHATSAPP_SCOPE = "whatsapp_business_management";

// WhatsApp is not a platform of its own here: Click-to-WhatsApp ads are Meta ads,
// so OrbitOps asks for one extra permission on the Meta connection when the plan
// includes WhatsApp. This card explains that, and says whether the permission was
// actually granted — a person can untick it on Meta's screen.
export function WhatsAppCard({ meta }: { meta: AdProviderState | undefined }) {
  const connection = meta?.connection ?? null;
  const connected = meta?.status === "connected" && !!connection;
  const granted = !!connection?.scopes?.includes(WHATSAPP_SCOPE);

  const state = !meta || !meta.enabled
    ? "meta_off"
    : !connected
      ? "meta_not_connected"
      : granted
        ? "ready"
        : "permission_missing";

  const badge =
    state === "ready"
      ? { label: "Ready", variant: "secondary" as const }
      : state === "permission_missing"
        ? { label: "Permission not granted", variant: "destructive" as const }
        : { label: "Comes with Meta", variant: "outline" as const };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
          <MessageCircle className="size-5 text-primary" aria-hidden />
          WhatsApp
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </CardTitle>
        <CardDescription>Click-to-WhatsApp ads, which run on Meta.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {state === "meta_off" && (
          <p className="text-muted-foreground">
            WhatsApp ads need the Meta platform, which isn&apos;t part of your plan. Contact OrbitOps to add it.
          </p>
        )}
        {state === "meta_not_connected" && (
          <p className="text-muted-foreground">
            There is nothing separate to connect: connect Meta above and allow WhatsApp access, and
            Click-to-WhatsApp ads come with it.
          </p>
        )}
        {state === "ready" && (
          <p className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-primary" aria-hidden />
            Your Meta connection includes WhatsApp access.
          </p>
        )}
        {state === "permission_missing" && (
          <p className="flex items-start gap-2 text-destructive">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            Meta is connected, but WhatsApp access wasn&apos;t allowed. Connect Meta again and leave the
            WhatsApp permission ticked.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

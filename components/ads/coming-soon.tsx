"use client";

import { Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SHARED = "It's part of an upcoming Ad Manager feature and isn't built yet. Nothing is lost by pressing it — there's simply nothing behind it so far.";

// Why a button or a tab exists while the feature behind it doesn't: the product
// has six Ad Manager tabs and two header actions, and quietly dropping five of
// them would read as a smaller product rather than one still being built. Every
// one of them says the same thing instead of failing or leading nowhere.
export function AdComingSoonDialog({
  open,
  onOpenChange,
  title,
  blurb,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  title: string;
  blurb?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title} — coming soon</DialogTitle>
          <DialogDescription>{blurb ? `${blurb} ${SHARED}` : SHARED}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// The body of a tab whose feature hasn't been built. Deliberately not an error
// and not a not-found page: the tab is real, the feature is simply still to come.
export function AdComingSoonPanel({ title, blurb }: { title: string; blurb?: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 px-6 py-14 text-center">
        <span className="rounded-full bg-accent p-3 text-primary">
          <Sparkles className="size-6" aria-hidden />
        </span>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="max-w-prose text-sm text-muted-foreground">
          This is part of an upcoming Ad Manager feature.{blurb ? ` ${blurb}` : ""}
        </p>
        <p className="max-w-prose text-sm text-muted-foreground">
          Your connected platforms keep syncing in the meantime, so the figures on the Campaigns tab
          stay up to date.
        </p>
      </CardContent>
    </Card>
  );
}

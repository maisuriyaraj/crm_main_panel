"use client";

import { useEffect, useRef, useState } from "react";

import { registerExpiredNotice } from "@/lib/auth/session";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Mounted once in the root layout. By the time it opens, endSession has
// already wiped cookies, storage and Redux, so nothing protected is behind it;
// acknowledging only performs the final redirect to signin.
export function SessionExpiredDialog() {
  const [open, setOpen] = useState(false);
  const acknowledgeRef = useRef<(() => void) | null>(null);

  useEffect(
    () =>
      registerExpiredNotice((acknowledge) => {
        acknowledgeRef.current = acknowledge;
        setOpen(true);
      }),
    [],
  );

  const handleAcknowledge = () => {
    const acknowledge = acknowledgeRef.current;
    acknowledgeRef.current = null;
    acknowledge?.();
  };

  return (
    <AlertDialog
      open={open}
      // Escape counts as acknowledging; there is no session to go back to.
      onOpenChange={(next) => {
        if (!next) handleAcknowledge();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Session expired</AlertDialogTitle>
          <AlertDialogDescription>
            Your session has expired. Please sign in again to continue.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleAcknowledge}>Sign in again</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

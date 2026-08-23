"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Lock } from "lucide-react";

import { pageRoutes } from "@/lib/constants";
import { useAppDispatch } from "@/lib/store/hooks";
import { reqToFetchMe, reqToResetPassword } from "@/lib/store/slices/authSlice";
import { useAuth } from "@/hooks/useAuth";
import { notify } from "@/lib/commonFunctions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user, isAuthChecked, needResetPassword } = useAuth();

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  useEffect(() => {
    if (!isAuthChecked) {
      dispatch(reqToFetchMe({ data: null }));
    }
  }, [dispatch, isAuthChecked]);

  useEffect(() => {
    if (!isAuthChecked) return;

    if (!user) {
      router.replace(pageRoutes.signin);
      return;
    }

  }, [isAuthChecked, user, router]);

  const onSubmit = (values: ResetPasswordValues) => {
    dispatch(
      reqToResetPassword({
        data: { new_password: values.newPassword, new_creation : 1},
        onSuccess: () => {
          notify("Password updated. Welcome in!", { type: "success" });
          dispatch(
            reqToFetchMe({
              data: null,
              onSuccess: (me: { data:any }) => {
                router.replace(`/${me?.data?.organizationId}/${pageRoutes.dashboard}`);
              },
              onFailure: () => {
                notify("Password updated. Please sign in again.", { type: "info" });
                router.replace(pageRoutes.signin);
              },
            }),
          );
        },
        onFailure: () => {
          notify("Couldn't update your password. Please try again.", { type: "error" });
        },
      }),
    );
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 h-[450px] w-[450px] rounded-full bg-primary/20 blur-[140px]" />
      </div>

      <div className="relative z-10 w-full max-w-md rounded-3xl border border-border bg-glass backdrop-blur-xl p-8 panel-shadow">
        <h1 className="text-3xl font-bold">Set a New Password</h1>

        <p className="mt-2 text-muted-foreground">
          For security, you need to set a new password before continuing.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input type="password" placeholder="••••••••" className="pl-10" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input type="password" placeholder="••••••••" className="pl-10" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}

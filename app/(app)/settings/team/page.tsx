"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { pageRoutes } from "@/lib/constants";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  OrgUser,
  reqToCreateOrgUser,
  reqToDeleteOrgUser,
  reqToGetOrgUsers,
  reqToUpdateOrgUser,
} from "@/lib/store/slices/orgUsersSlice";
import { useAuth } from "@/hooks/useAuth";
import { notify } from "@/lib/commonFunctions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable, DataTableColumn } from "@/components/ui/data-table";
import { UserFormDialog } from "@/components/team/user-form-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function TeamSettingsPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { role } = useAuth();
  const { users, isLoading } = useAppSelector((state) => state.orgUsers);

  useEffect(() => {
    if (role && role !== "org_admin") {
      router.replace(pageRoutes.dashboard);
    }
  }, [role, router]);

  useEffect(() => {
    dispatch(reqToGetOrgUsers({ data: null }));
  }, [dispatch]);

  if (role !== "org_admin") {
    return null;
  }

  const handleCreate = (values: { fullName: string; email: string; role: string }) => {
    dispatch(
      reqToCreateOrgUser({
        data: values,
        onSuccess: () => {
          notify("Invite sent.", { type: "success" });
          dispatch(reqToGetOrgUsers({ data: null }));
        },
        onFailure: () => notify("Couldn't send invite. Please try again.", { type: "error" }),
      }),
    );
  };

  const handleEdit = (id: string, values: { role: string; status: string }) => {
    dispatch(
      reqToUpdateOrgUser({
        data: { id, ...values },
        onSuccess: () => {
          notify("User updated.", { type: "success" });
          dispatch(reqToGetOrgUsers({ data: null }));
        },
        onFailure: () => notify("Couldn't update user. Please try again.", { type: "error" }),
      }),
    );
  };

  const handleDisable = (id: string) => {
    dispatch(
      reqToDeleteOrgUser({
        data: { id },
        onSuccess: () => notify("User disabled.", { type: "success" }),
        onFailure: () => notify("Couldn't disable user. Please try again.", { type: "error" }),
      }),
    );
  };

  const columns: DataTableColumn<OrgUser>[] = [
    { key: "fullName", header: "Name", sortable: true },
    { key: "email", header: "Email", sortable: true },
    {
      key: "role",
      header: "Role",
      sortable: true,
      render: (row) => <Badge variant="secondary">{row.role}</Badge>,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => (
        <Badge variant={row.status === "active" ? "default" : "outline"}>{row.status}</Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (row) => (
        <div className="flex justify-end gap-2">
          <UserFormDialog
            mode="edit"
            initialValues={row}
            onSubmit={(values) => handleEdit(row.id, values as { role: string; status: string })}
            trigger={
              <Button variant="outline" size="sm">
                Edit
              </Button>
            }
          />

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={row.status === "disabled"}>
                Disable
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Disable {row.fullName}?</AlertDialogTitle>
                <AlertDialogDescription>
                  They&apos;ll immediately lose access to this organization&apos;s workspace.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleDisable(row.id)}>
                  Disable
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-muted-foreground">Manage who has access to your organization.</p>
        </div>

        <UserFormDialog
          mode="create"
          onSubmit={(values) =>
            handleCreate(values as { fullName: string; email: string; role: string })
          }
          trigger={
            <Button>
              <Plus />
              Invite User
            </Button>
          }
        />
      </div>

      <DataTable
        columns={columns}
        data={users}
        getRowId={(row) => row.id}
        searchKeys={["fullName", "email"]}
        searchPlaceholder="Search team members..."
        emptyMessage={isLoading ? "Loading..." : "No team members yet."}
      />
    </div>
  );
}

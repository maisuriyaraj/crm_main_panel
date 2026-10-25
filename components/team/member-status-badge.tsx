import type { MemberStatus } from "@/lib/team/types";
import { Badge } from "@/components/ui/badge";

const LABELS: Record<MemberStatus, string> = {
  active: "Active",
  suspended: "Suspended",
  invited: "Invited",
};

export function MemberStatusBadge({ status }: { status: MemberStatus }) {
  return (
    <Badge variant={status === "active" ? "default" : "outline"} className={status === "active" ? undefined : "text-muted-foreground"}>
      {LABELS[status]}
    </Badge>
  );
}

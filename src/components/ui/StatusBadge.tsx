import { cn } from "@/lib/utils";
import type { EmpStatus } from "@prisma/client";

const statusStyles: Record<EmpStatus, string> = {
  ACTIVE: "bg-green-50 text-green-700 ring-green-600/20",
  ONBOARDING: "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
  LEAVE: "bg-red-50 text-red-700 ring-red-600/20",
  INACTIVE: "bg-gray-50 text-gray-600 ring-gray-500/20",
};

const statusLabels: Record<EmpStatus, string> = {
  ACTIVE: "Active",
  ONBOARDING: "Onboarding",
  LEAVE: "On Leave",
  INACTIVE: "Inactive",
};

interface StatusBadgeProps {
  status: EmpStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        statusStyles[status] || "bg-gray-50 text-gray-600",
        className
      )}
    >
      {statusLabels[status] || status}
    </span>
  );
}

"use client";

import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/Avatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useSelection } from "@/stores/selection";
import type { EmployeeRow as EmployeeRowType } from "@/shared/types";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface EmployeeRowProps {
  employee: EmployeeRowType;
  index: number;
  style: React.CSSProperties;
}

export function EmployeeRow({ employee, index, style }: EmployeeRowProps) {
  const { selectedIds, toggleId } = useSelection();
  const isSelected = selectedIds.has(employee.id);

  return (
    <div
      style={style}
      className={cn(
        "grid grid-cols-[40px_60px_1fr_1fr_140px_120px_220px_40px] items-center gap-3 px-4 border-b border-gray-100 hover:bg-gray-50 transition-colors",
        isSelected && "bg-nexus-50",
        index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
      )}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-gray-300 text-nexus-500 focus:ring-nexus-500 cursor-pointer"
        checked={isSelected}
        onChange={() => toggleId(employee.id)}
      />

      {/* Avatar */}
      <Avatar firstName={employee.firstName} lastName={employee.lastName} size="md" />

      {/* Name + ID */}
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {employee.firstName} {employee.lastName}
        </p>
        <p className="text-xs text-gray-500 truncate">{employee.employeeId}</p>
      </div>

      {/* Job Title */}
      <p className="text-sm text-gray-700 truncate">
        {employee.jobTitle || <span className="text-gray-400 italic">No title</span>}
      </p>

      {/* Department */}
      <p className="text-sm text-gray-600 truncate">{employee.department.name}</p>

      {/* Status */}
      <StatusBadge status={employee.status} />

      {/* Email */}
      <p className="text-sm text-gray-500 truncate">{employee.user.email}</p>

      {/* Detail link */}
      <Link
        href={`/directory/${employee.id}`}
        className="flex items-center justify-end text-gray-400 hover:text-nexus-500"
      >
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

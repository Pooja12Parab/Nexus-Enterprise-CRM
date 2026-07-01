"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSelection } from "@/stores/selection";

interface PaginationFooterProps {
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function PaginationFooter({
  page,
  totalPages,
  totalCount,
  onPageChange,
  className,
}: PaginationFooterProps) {
  const { selectedIds, clearSelection } = useSelection();

  return (
    <div className={cn("flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50", className)}>
      <div className="text-sm text-gray-600">
        {selectedIds.size > 0 ? (
          <span>
            <span className="font-medium">{selectedIds.size}</span> of{" "}
            <span className="font-medium">{totalCount}</span> selected
          </span>
        ) : (
          <span>
            Showing page <span className="font-medium">{page}</span> of{" "}
            <span className="font-medium">{totalPages}</span> ({totalCount} total)
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {selectedIds.size > 0 && (
          <>
            <button className="btn-secondary text-xs py-1.5">Bulk Update</button>
            <button className="btn-secondary text-xs py-1.5" onClick={clearSelection}>
              Clear Selection
            </button>
          </>
        )}
        <button
          className="btn-secondary text-xs py-1.5 disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm text-gray-700 px-2">
          {page} / {totalPages}
        </span>
        <button
          className="btn-secondary text-xs py-1.5 disabled:opacity-40"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

"use client";

import { useRef } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { EmployeeRow as EmployeeRowType } from "@/shared/types";
import { useDirectoryFilters } from "@/hooks/use-directory-filters";
import { useSelection } from "@/stores/selection";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Avatar } from "@/components/ui/Avatar";
import { PaginationFooter } from "@/components/directory/PaginationFooter";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

const GRID_TEMPLATE = "40px 250px 200px 160px 130px 220px 130px 130px";

interface EmployeeDataGridProps {
  data: EmployeeRowType[];
  isLoading: boolean;
  totalPages: number;
  totalCount: number;
}

function SortIcon({ columnId, sortBy, sortDir }: { columnId: string; sortBy: string; sortDir: string }) {
  if (sortBy !== columnId) return <ArrowUpDown className="h-3 w-3 text-gray-400" />;
  return sortDir === "asc"
    ? <ArrowUp className="h-3 w-3 text-nexus-500" />
    : <ArrowDown className="h-3 w-3 text-nexus-500" />;
}

export function EmployeeDataGrid({ data, isLoading, totalPages, totalCount }: EmployeeDataGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { filters, setters } = useDirectoryFilters();
  const { selectedIds, toggleId, selectAll, clearSelection } = useSelection();

  const allIds = data.map((r) => r.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));

  const columns: ColumnDef<EmployeeRowType>[] = [
    {
      id: "selection",
      size: 40,
      enableSorting: false,
      header: () => (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 text-nexus-500 focus:ring-nexus-500 cursor-pointer"
          checked={allSelected}
          onChange={() => (allSelected ? clearSelection() : selectAll(allIds))}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 text-nexus-500 focus:ring-nexus-500 cursor-pointer"
          checked={selectedIds.has(row.original.id)}
          onChange={() => toggleId(row.original.id)}
        />
      ),
    },
    {
      id: "name", header: "Employee", size: 250, accessorKey: "lastName",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar firstName={row.original.firstName} lastName={row.original.lastName} size="md" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{row.original.firstName} {row.original.lastName}</p>
            <p className="text-xs text-gray-500">{row.original.employeeId}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "jobTitle", header: "Role", size: 200,
      cell: ({ getValue }) => <span className="text-sm text-gray-700">{getValue<string>() || "—"}</span>,
    },
    {
      id: "department", header: "Department", size: 160, accessorFn: (row) => row.department.name,
      cell: ({ getValue }) => <span className="text-sm text-gray-600">{getValue<string>()}</span>,
    },
    {
      accessorKey: "status", header: "Status", size: 130,
      cell: ({ getValue }) => <StatusBadge status={getValue() as EmployeeRowType["status"]} />,
    },
    {
      id: "email", header: "Email", size: 220, accessorFn: (row) => row.user?.email ?? null,
      cell: ({ getValue }) => <span className="text-sm text-gray-500 truncate">{getValue<string>() || "—"}</span>,
    },
    {
      accessorKey: "location", header: "Location", size: 130,
      cell: ({ getValue }) => <span className="text-sm text-gray-500">{getValue<string>() || "—"}</span>,
    },
    {
      accessorKey: "hireDate", header: "Hire Date", size: 130,
      cell: ({ getValue }) => {
        const date = getValue<Date | null>();
        if (!date) return <span className="text-sm text-gray-400">—</span>;
        return <span className="text-sm text-gray-500">{new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</span>;
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: true,
    manualSorting: true,
    state: { sorting: [{ id: filters.sortBy, desc: filters.sortDir === "desc" }] },
    onSortingChange: (updater) => {
      if (typeof updater === "function") {
        const current = [{ id: filters.sortBy, desc: filters.sortDir === "desc" }];
        const next = updater(current);
        if (next.length > 0) {
          setters.setSortBy(next[0].id as typeof filters.sortBy);
          setters.setSortDir(next[0].desc ? "desc" : "asc");
        }
      }
    },
  });

  const { rows } = table.getRowModel();
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 56,
    overscan: 10,
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-card p-8">
        <div className="animate-pulse space-y-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-card overflow-hidden">
      <div ref={containerRef} className="h-[600px] overflow-auto" style={{ contain: "strict" }}>
        <div className="min-w-fit">
          {/* Header row */}
          <div className="sticky top-0 z-10 grid items-center gap-3 px-4 bg-gray-50 border-b border-gray-200"
            style={{ gridTemplateColumns: GRID_TEMPLATE }}>
            {table.getHeaderGroups().flatMap((headerGroup) =>
              headerGroup.headers.map((header) => {
                const canSort = header.column.getCanSort();
                return (
                  <div key={header.id}
                    className="h-table-row text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1 cursor-pointer select-none"
                    onClick={canSort ? header.column.getToggleSortingHandler() : undefined}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {canSort && <SortIcon columnId={header.column.id} sortBy={filters.sortBy} sortDir={filters.sortDir} />}
                  </div>
                );
              })
            )}
          </div>
          {/* Virtualized body */}
          <div style={{ position: "relative", height: `${rowVirtualizer.getTotalSize()}px` }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              const isSelected = selectedIds.has(row.original.id);
              return (
                <div key={row.id} style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${virtualRow.start}px)` }}>
                  <div className={`grid items-center gap-3 px-4 h-14 border-b border-gray-100 hover:bg-gray-50 ${isSelected ? "bg-nexus-50" : ""}`}
                    style={{ gridTemplateColumns: GRID_TEMPLATE }}>
                    {row.getVisibleCells().map((cell) => (
                      <div key={cell.id} className="overflow-hidden">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <PaginationFooter
        page={filters.page}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={setters.setPage}
      />
    </div>
  );
}
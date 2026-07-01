"use client";

import { useRef, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { EmployeeRow as EmployeeRowType } from "@/shared/types";
import { useSelection } from "@/stores/selection";
import { useDirectoryFilters } from "@/hooks/use-directory-filters";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Avatar } from "@/components/ui/Avatar";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface EmployeeDataGridProps {
  data: EmployeeRowType[];
  isLoading: boolean;
}

export function EmployeeDataGrid({ data, isLoading }: EmployeeDataGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { selectedIds, toggleId, selectAll, clearSelection } = useSelection();
  const { filters, setters } = useDirectoryFilters();

  const columns: ColumnDef<EmployeeRowType>[] = [
    {
      id: "select", size: 40,
      header: () => (
        <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-nexus-500 cursor-pointer"
          checked={data.length > 0 && selectedIds.size === data.length}
          onChange={(e) => e.target.checked ? selectAll(data.map((r) => r.id)) : clearSelection()} />
      ),
      cell: ({ row }) => (
        <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-nexus-500 cursor-pointer"
          checked={selectedIds.has(row.original.id)}
          onChange={() => toggleId(row.original.id)} />
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
      id: "email", header: "Email", size: 220, accessorFn: (row) => row.user.email,
      cell: ({ getValue }) => <span className="text-sm text-gray-500 truncate">{getValue<string>()}</span>,
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

  const SortIcon = useCallback(
    (columnId: string) => {
      if (filters.sortBy !== columnId) return <ArrowUpDown className="h-3 w-3 text-gray-400" />;
      return filters.sortDir === "asc" ? <ArrowUp className="h-3 w-3 text-nexus-500" /> : <ArrowDown className="h-3 w-3 text-nexus-500" />;
    },
    [filters.sortBy, filters.sortDir]
  );

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
        <table className="w-full table-fixed">
          <thead className="sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  return (
                    <th key={header.id} style={{ width: header.getSize() }}
                      className="table-header text-left cursor-pointer select-none"
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}>
                      <div className="flex items-center gap-1">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && SortIcon(header.column.id)}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            <tr style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
              <td colSpan={columns.length} className="p-0">
                <div style={{ position: "relative" }}>
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const row = rows[virtualRow.index];
                    return (
                      <div key={row.id} style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${virtualRow.start}px)` }}>
                        <div className="grid items-center gap-3 px-4 h-14 border-b border-gray-100 hover:bg-gray-50"
                          style={{ gridTemplateColumns: "40px 250px 200px 160px 130px 220px 130px 130px" }}>
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
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
        <span className="text-sm text-gray-600">{selectedIds.size > 0 ? `${selectedIds.size} selected` : `Page ${filters.page}`}</span>
        <div className="flex items-center gap-2">
          <button className="btn-secondary text-xs py-1.5 disabled:opacity-50" disabled={filters.page <= 1} onClick={() => setters.setPage(Math.max(1, filters.page - 1))}>Previous</button>
          <button className="btn-secondary text-xs py-1.5" onClick={() => setters.setPage(filters.page + 1)}>Next</button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEmployees } from "@/hooks/use-employees";
import { useDirectoryFilters } from "@/hooks/use-directory-filters";
import { EmployeeDataGrid } from "@/components/directory/EmployeeDataGrid";
import { FilterBar } from "@/components/directory/FilterBar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorCard } from "@/components/ui/ErrorCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Users } from "lucide-react";
import Link from "next/link";

export default function DirectoryPage() {
  const { filters, clearFilters } = useDirectoryFilters();
  const { data, isLoading, isError, error, refetch } = useEmployees({
    page: filters.page,
    dept: filters.dept,
    status: filters.status,
    search: filters.search,
    sortBy: filters.sortBy,
    sortDir: filters.sortDir,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Directory</h1>
          <p className="text-sm text-gray-500 mt-1">
            {data ? `${data.meta.totalCount} employees` : "Loading..."}
          </p>
        </div>
        <Link href="/onboarding" className="btn-primary inline-flex items-center gap-2">
          <span className="text-lg leading-none">+</span>
          Onboard Employee
        </Link>
      </div>

      <FilterBar />

      {isLoading && <LoadingSpinner size="lg" label="Loading employees..." />}

      {isError && (
        <ErrorCard
          message={error?.message || "Failed to load employees"}
          onRetry={() => refetch()}
        />
      )}

      {data && data.data.length === 0 && (
        <EmptyState
          icon={<Users className="h-8 w-8 text-gray-400" />}
          title="No employees found"
          description="Try adjusting your filters or search terms."
          action={
            <button onClick={clearFilters} className="btn-secondary">
              Clear Filters
            </button>
          }
        />
      )}

      {data && data.data.length > 0 && (
        <EmployeeDataGrid
          data={data.data}
          isLoading={isLoading}
          totalPages={data.meta.totalPages}
          totalCount={data.meta.totalCount}
        />
      )}
    </div>
  );
}

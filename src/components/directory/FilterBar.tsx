"use client";

import { useDirectoryFilters } from "@/hooks/use-directory-filters";
import { useDepartments } from "@/hooks/use-departments";
import { FilterChip } from "@/components/directory/FilterChip";
import { Search, X, Filter } from "lucide-react";

export function FilterBar() {
  const { filters, setters, clearFilters, hasActiveFilters } = useDirectoryFilters();
  const { data: departments } = useDepartments();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, ID, or title..."
            value={filters.search}
            onChange={(e) => {
              setters.setSearch(e.target.value);
              setters.setPage(1);
            }}
            className="input-field pl-10 pr-8"
          />
          {filters.search && (
            <button
              onClick={() => setters.setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Department filter */}
        <select
          value={filters.dept}
          onChange={(e) => {
            setters.setDept(e.target.value);
            setters.setPage(1);
          }}
          className="input-field w-48"
        >
          <option value="All">All Departments</option>
          {departments?.map((d) => (
            <option key={d.id} value={d.name}>
              {d.name} ({d.employeeCount})
            </option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={filters.status}
          onChange={(e) => {
            setters.setStatus(e.target.value);
            setters.setPage(1);
          }}
          className="input-field w-44"
        >
          <option value="All">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="ONBOARDING">Onboarding</option>
          <option value="LEAVE">On Leave</option>
          <option value="INACTIVE">Inactive</option>
        </select>

        {/* Clear all */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
            Clear filters
          </button>
        )}
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          {filters.dept !== "All" && (
            <FilterChip
              label="Department"
              value={filters.dept}
              onRemove={() => setters.setDept("All")}
            />
          )}
          {filters.status !== "All" && (
            <FilterChip
              label="Status"
              value={filters.status}
              onRemove={() => setters.setStatus("All")}
            />
          )}
          {filters.search && (
            <FilterChip
              label="Search"
              value={filters.search}
              onRemove={() => setters.setSearch("")}
            />
          )}
        </div>
      )}
    </div>
  );
}

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { EmployeeQuery } from "@/shared/schemas/employee";
import type { PaginatedResponse, EmployeeRow } from "@/shared/types";

async function fetchEmployees(params: EmployeeQuery): Promise<PaginatedResponse<EmployeeRow>> {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "All" && v !== "") {
      sp.set(k, String(v));
    }
  });
  const res = await fetch(`/api/employees?${sp.toString()}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || "Failed to fetch employees");
  }
  return res.json();
}

export function useEmployees(params: Partial<EmployeeQuery>) {
  const fullParams: EmployeeQuery = {
    ...params,
    page: params.page ?? 1,
    sortBy: params.sortBy ?? "lastName",
    sortDir: params.sortDir ?? "asc",
    limit: params.limit ?? 50,
  } as EmployeeQuery;

  return useQuery({
    queryKey: ["employees", fullParams],
    queryFn: () => fetchEmployees(fullParams),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

import { useQuery } from "@tanstack/react-query";
import type { DepartmentOption } from "@/shared/types";

async function fetchDepartments(): Promise<DepartmentOption[]> {
  const res = await fetch("/api/departments");
  if (!res.ok) throw new Error("Failed to fetch departments");
  return res.json();
}

export function useDepartments() {
  return useQuery({
    queryKey: ["departments"],
    queryFn: fetchDepartments,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
}

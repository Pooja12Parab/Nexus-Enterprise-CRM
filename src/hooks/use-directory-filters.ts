import { useQueryState, parseAsString, parseAsInteger, parseAsStringEnum } from "nuqs";

export function useDirectoryFilters() {
  const [dept, setDept] = useQueryState("dept", parseAsString.withDefault("All"));
  const [status, setStatus] = useQueryState("status", parseAsString.withDefault("All"));
  const [search, setSearch] = useQueryState("search", parseAsString.withDefault(""));
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [sortBy, setSortBy] = useQueryState(
    "sortBy",
    parseAsStringEnum(["firstName", "lastName", "jobTitle", "status", "createdAt", "employeeId"]).withDefault("lastName")
  );
  const [sortDir, setSortDir] = useQueryState(
    "sortDir",
    parseAsStringEnum(["asc", "desc"]).withDefault("asc")
  );

  const clearFilters = () => {
    setDept("All");
    setStatus("All");
    setSearch("");
    setPage(1);
  };

  const hasActiveFilters = dept !== "All" || status !== "All" || search !== "";

  return {
    filters: { dept, status, search, page, sortBy, sortDir },
    setters: { setDept, setStatus, setSearch, setPage, setSortBy, setSortDir },
    clearFilters,
    hasActiveFilters,
  };
}

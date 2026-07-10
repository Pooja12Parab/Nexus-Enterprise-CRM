import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FilterBar } from "@/components/directory/FilterBar";
import "@testing-library/jest-dom/vitest";

// Mock useDepartments
vi.mock("@/hooks/use-departments", () => ({
  useDepartments: () => ({
    data: [
      { id: "d1", name: "Engineering", employeeCount: 71 },
      { id: "d2", name: "Design", employeeCount: 64 },
      { id: "d3", name: "Product", employeeCount: 64 },
    ],
    isLoading: false,
    isError: false,
  }),
}));

// Mock nuqs
vi.mock("nuqs", () => ({
  parseAsString: () => ({ withDefault: () => ({}) }),
  parseAsInteger: () => ({ withDefault: () => ({}) }),
  parseAsStringEnum: () => ({ withDefault: () => ({}) }),
  useQueryState: () => ["", vi.fn()],
}));

import { useDirectoryFilters } from "@/hooks/use-directory-filters";

function buildMock(overrides: Partial<ReturnType<typeof useDirectoryFilters>> = {}): ReturnType<typeof useDirectoryFilters> {
  const setters = {
    setDept: vi.fn(),
    setStatus: vi.fn(),
    setSearch: vi.fn(),
    setPage: vi.fn(),
    setSortBy: vi.fn(),
    setSortDir: vi.fn(),
  };
  return {
    filters: { dept: "All", status: "All", search: "", page: 1, sortBy: "lastName", sortDir: "asc", ...((overrides as any)?.filters || {}) },
    setters: { ...setters, ...((overrides as any)?.setters || {}) },
    clearFilters: vi.fn(),
    hasActiveFilters: false,
    ...overrides,
  };
}

vi.mock("@/hooks/use-directory-filters", () => ({
  useDirectoryFilters: vi.fn(() => buildMock()),
}));

describe("FilterBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useDirectoryFilters).mockReturnValue(buildMock());
  });

  it("renders search input with correct placeholder", () => {
    render(<FilterBar />);
    expect(screen.getByPlaceholderText("Search by name, ID, or title...")).toBeInTheDocument();
  });

  it("renders department dropdown with All Departments default", () => {
    render(<FilterBar />);
    expect(screen.getByText("All Departments")).toBeInTheDocument();
  });

  it("renders department options from useDepartments", () => {
    render(<FilterBar />);
    expect(screen.getByText("Engineering (71)")).toBeInTheDocument();
    expect(screen.getByText("Design (64)")).toBeInTheDocument();
    expect(screen.getByText("Product (64)")).toBeInTheDocument();
  });

  it("renders status dropdown with all 4 status options", () => {
    render(<FilterBar />);
    expect(screen.getByText("All Statuses")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Onboarding")).toBeInTheDocument();
    expect(screen.getByText("On Leave")).toBeInTheDocument();
    expect(screen.getByText("Inactive")).toBeInTheDocument();
  });

  it("typing in search calls setSearch and setPage(1)", () => {
    const setSearch = vi.fn();
    const setPage = vi.fn();
    vi.mocked(useDirectoryFilters).mockReturnValue(buildMock({ setters: { setSearch, setPage } as any }));

    render(<FilterBar />);
    const input = screen.getByPlaceholderText("Search by name, ID, or title...");
    fireEvent.change(input, { target: { value: "Marcus" } });
    expect(setSearch).toHaveBeenCalledWith("Marcus");
    expect(setPage).toHaveBeenCalledWith(1);
  });

  it("selecting a department calls setDept and setPage(1)", () => {
    const setDept = vi.fn();
    const setPage = vi.fn();
    vi.mocked(useDirectoryFilters).mockReturnValue(buildMock({ setters: { setDept, setPage } as any }));

    render(<FilterBar />);
    const selects = document.querySelectorAll("select");
    fireEvent.change(selects[0], { target: { value: "Engineering" } });
    expect(setDept).toHaveBeenCalledWith("Engineering");
    expect(setPage).toHaveBeenCalledWith(1);
  });

  it("selecting a status calls setStatus and setPage(1)", () => {
    const setStatus = vi.fn();
    const setPage = vi.fn();
    vi.mocked(useDirectoryFilters).mockReturnValue(buildMock({ setters: { setStatus, setPage } as any }));

    render(<FilterBar />);
    const selects = document.querySelectorAll("select");
    fireEvent.change(selects[1], { target: { value: "ACTIVE" } });
    expect(setStatus).toHaveBeenCalledWith("ACTIVE");
    expect(setPage).toHaveBeenCalledWith(1);
  });

  it("clear X button appears when search has value", () => {
    vi.mocked(useDirectoryFilters).mockReturnValue(buildMock({
      filters: { dept: "All", status: "All", search: "Marcus", page: 1, sortBy: "lastName", sortDir: "asc" },
    }));

    render(<FilterBar />);
    // An X button inside the search wrapper
    const searchContainer = screen.getByPlaceholderText("Search by name, ID, or title...").closest("div")!;
    const xButtons = searchContainer.querySelectorAll("button");
    expect(xButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("filter chips appear when filters active and remove on click", () => {
    const setStatus = vi.fn();
    vi.mocked(useDirectoryFilters).mockReturnValue(buildMock({
      filters: { dept: "All", status: "ACTIVE", search: "", page: 1, sortBy: "lastName", sortDir: "asc" },
      setters: { setStatus } as any,
      hasActiveFilters: true,
    }));

    render(<FilterBar />);
    expect(screen.getByText("ACTIVE")).toBeInTheDocument();
    // Remove button has aria-label "Remove Status filter: ACTIVE"
    const removeBtn = screen.getByLabelText("Remove Status filter: ACTIVE");
    fireEvent.click(removeBtn);
    expect(setStatus).toHaveBeenCalledWith("All");
  });

  it("clear filters button visible when hasActiveFilters", () => {
    vi.mocked(useDirectoryFilters).mockReturnValue(buildMock({
      filters: { dept: "All", status: "All", search: "Marcus", page: 1, sortBy: "lastName", sortDir: "asc" },
      hasActiveFilters: true,
    }));

    render(<FilterBar />);
    expect(screen.getByText("Clear filters")).toBeInTheDocument();
  });
});
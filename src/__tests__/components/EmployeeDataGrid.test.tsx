import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EmployeeDataGrid } from "@/components/directory/EmployeeDataGrid";
import { useSelection } from "@/stores/selection";
import { useDirectoryFilters } from "@/hooks/use-directory-filters";
import type { EmployeeRow } from "@/shared/types";
import "@testing-library/jest-dom/vitest";

// Mock the virtualizer to render all items synchronously
vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count, estimateSize }: { count: number; estimateSize: () => number }) => {
    const items = Array.from({ length: count }, (_, i) => ({
      key: i,
      index: i,
      start: i * estimateSize(),
      size: estimateSize(),
      measureElement: () => {},
    }));
    return {
      getVirtualItems: () => items,
      getTotalSize: () => count * estimateSize(),
      measureElement: () => {},
    };
  },
}));

// Mock nuqs — return default filter values
vi.mock("nuqs", () => ({
  parseAsString: () => ({ withDefault: () => ({}) }),
  parseAsInteger: () => ({ withDefault: () => ({}) }),
  parseAsStringEnum: () => ({ withDefault: () => ({}) }),
  useQueryState: () => ["", vi.fn()],
}));

// Shared mock for directory filters
const mockSetters = {
  setDept: vi.fn(),
  setStatus: vi.fn(),
  setSearch: vi.fn(),
  setPage: vi.fn(),
  setSortBy: vi.fn(),
  setSortDir: vi.fn(),
};
const mockFilters = {
  filters: { dept: "All", status: "All", search: "", page: 1, sortBy: "lastName", sortDir: "asc" },
  setters: mockSetters,
  clearFilters: vi.fn(),
  hasActiveFilters: false,
};

// Mock the directory filters hook
vi.mock("@/hooks/use-directory-filters", () => ({
  useDirectoryFilters: () => mockFilters,
}));

function makeEmployee(overrides: Partial<EmployeeRow> = {}): EmployeeRow {
  return {
    id: "emp-001",
    employeeId: "EMP-073",
    firstName: "Jack",
    lastName: "Allen",
    jobTitle: "Product Designer",
    department: { id: "dept-1", name: "Product" },
    status: "ONBOARDING",
    user: { email: "jack.allen@nexus.com" },
    location: "Chicago",
    hireDate: new Date("2025-04-21"),
    phoneNumber: null,
    ...overrides,
  };
}

describe("EmployeeDataGrid", () => {
  beforeEach(() => {
    useSelection.getState().clearSelection();
  });

  it("renders all column headers", () => {
    render(<EmployeeDataGrid data={[makeEmployee()]} isLoading={false} totalPages={1} totalCount={1} />);
    expect(screen.getByText("Employee")).toBeTruthy();
    expect(screen.getByText("Role")).toBeTruthy();
    expect(screen.getByText("Department")).toBeTruthy();
    expect(screen.getByText("Status")).toBeTruthy();
    expect(screen.getByText("Email")).toBeTruthy();
    expect(screen.getByText("Location")).toBeTruthy();
    expect(screen.getByText("Hire Date")).toBeTruthy();
  });

  it("renders employee name and ID", () => {
    render(<EmployeeDataGrid data={[makeEmployee()]} isLoading={false} totalPages={1} totalCount={1} />);
    expect(screen.getByText("Jack Allen")).toBeTruthy();
    expect(screen.getByText("EMP-073")).toBeTruthy();
  });

  it("renders loading skeleton when isLoading", () => {
    const { container } = render(<EmployeeDataGrid data={[]} isLoading={true} totalPages={0} totalCount={0} />);
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("renders empty data without crashing", () => {
    const { container } = render(<EmployeeDataGrid data={[]} isLoading={false} totalPages={0} totalCount={0} />);
    expect(container.querySelector(".min-w-fit")).toBeTruthy();
  });

  it("renders job title or dash for null", () => {
    render(<EmployeeDataGrid data={[makeEmployee({ jobTitle: null })]} isLoading={false} totalPages={1} totalCount={1} />);
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it("renders email as dash when user is null", () => {
    render(<EmployeeDataGrid data={[makeEmployee({ user: null })]} isLoading={false} totalPages={1} totalCount={1} />);
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it("renders formatted hire date", () => {
    render(<EmployeeDataGrid data={[makeEmployee()]} isLoading={false} totalPages={1} totalCount={1} />);
    expect(screen.getByText("Apr 21, 2025")).toBeTruthy();
  });

  it("renders dash for null hire date", () => {
    render(<EmployeeDataGrid data={[makeEmployee({ hireDate: null })]} isLoading={false} totalPages={1} totalCount={1} />);
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it("renders checkbox for each row", () => {
    render(
      <EmployeeDataGrid
        data={[makeEmployee({ id: "emp-1" }), makeEmployee({ id: "emp-2", employeeId: "EMP-074" })]}
        isLoading={false}
        totalPages={1}
        totalCount={2}
      />
    );
    const checkboxes = document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    // One in header (select-all) + one per row
    expect(checkboxes.length).toBe(3);
  });

  it("checking a row checkbox toggles selection store", () => {
    render(<EmployeeDataGrid data={[makeEmployee({ id: "emp-1" })]} isLoading={false} totalPages={1} totalCount={1} />);
    const rowCheckbox = document.querySelector<HTMLInputElement>('input[type="checkbox"]:not([data-testid])');
    // Select-all is first, row is second
    const allCheckboxes = document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    fireEvent.click(allCheckboxes[1]);
    expect(useSelection.getState().isSelected("emp-1")).toBe(true);
  });

  it("select-all checkbox selects all rows", () => {
    render(
      <EmployeeDataGrid
        data={[makeEmployee({ id: "emp-1" }), makeEmployee({ id: "emp-2", employeeId: "EMP-074" })]}
        isLoading={false}
        totalPages={1}
        totalCount={2}
      />
    );
    const allCheckboxes = document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
    fireEvent.click(allCheckboxes[0]); // select-all
    expect(useSelection.getState().isSelected("emp-1")).toBe(true);
    expect(useSelection.getState().isSelected("emp-2")).toBe(true);
  });

  it("pagination shows page info", () => {
    render(<EmployeeDataGrid data={[makeEmployee()]} isLoading={false} totalPages={5} totalCount={250} />);
    expect(screen.getByText("1 / 5")).toBeTruthy();
  });

  it("pagination shows selection count when rows selected", () => {
    useSelection.getState().toggleId("emp-001");
    render(<EmployeeDataGrid data={[makeEmployee()]} isLoading={false} totalPages={1} totalCount={100} />);
    expect(screen.getByText(/selected/)).toBeTruthy();
  });

  it("renders StatusBadge with correct status", () => {
    render(<EmployeeDataGrid data={[makeEmployee({ status: "ACTIVE" })]} isLoading={false} totalPages={1} totalCount={1} />);
    expect(screen.getByText("Active")).toBeTruthy();
  });

  it("renders location or dash for null", () => {
    render(<EmployeeDataGrid data={[makeEmployee({ location: null })]} isLoading={false} totalPages={1} totalCount={1} />);
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it("clicking Employee sort header calls setSortBy", () => {
    render(<EmployeeDataGrid data={[makeEmployee()]} isLoading={false} totalPages={1} totalCount={1} />);
    const header = screen.getByText("Employee");
    fireEvent.click(header);
    expect(mockSetters.setSortBy).toHaveBeenCalled();
  });

  it("Previous button disabled on page 1", () => {
    render(<EmployeeDataGrid data={[makeEmployee()]} isLoading={false} totalPages={3} totalCount={50} />);
    const buttons = document.querySelectorAll<HTMLButtonElement>(".btn-secondary");
    expect(buttons[0]).toBeDisabled();
  });

  it("Next button enabled on page 1", () => {
    render(<EmployeeDataGrid data={[makeEmployee()]} isLoading={false} totalPages={3} totalCount={50} />);
    const buttons = document.querySelectorAll<HTMLButtonElement>(".btn-secondary");
    expect(buttons[1]).not.toBeDisabled();
  });
});

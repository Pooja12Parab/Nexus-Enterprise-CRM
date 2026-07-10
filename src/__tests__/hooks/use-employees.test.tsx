import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { useEmployees } from "@/hooks/use-employees";
import type { ReactNode } from "react";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("useEmployees", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls /api/employees with default params", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ data: [], meta: { totalCount: 0, page: 1, totalPages: 0, limit: 50 } }),
    });

    const { result } = renderHook(() => useEmployees({}), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain("page=1");
    expect(url).toContain("sortBy=lastName");
    expect(url).toContain("sortDir=asc");
    expect(url).toContain("limit=50");
  });

  it("handles API error by throwing", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () =>
        Promise.resolve({ error: { message: "Invalid query parameters" } }),
    });

    const { result } = renderHook(() => useEmployees({ page: 1 }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain("Invalid query parameters");
  });

  it("respects custom page, sort, and limit overrides", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ data: [], meta: { totalCount: 0, page: 3, totalPages: 0, limit: 25 } }),
    });

    const { result } = renderHook(
      () => useEmployees({ page: 3, sortBy: "firstName", sortDir: "desc", limit: 25 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain("page=3");
    expect(url).toContain("sortBy=firstName");
    expect(url).toContain("sortDir=desc");
    expect(url).toContain("limit=25");
  });

  it("omits undefined/null/All/empty params from URL", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ data: [], meta: { totalCount: 0, page: 1, totalPages: 0, limit: 50 } }),
    });

    const { result } = renderHook(
      () => useEmployees({ page: 1, dept: "All", status: "All", search: "" }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const url = mockFetch.mock.calls[0][0];
    expect(url).not.toContain("dept=");
    expect(url).not.toContain("status=");
    expect(url).not.toContain("search=");
  });
});
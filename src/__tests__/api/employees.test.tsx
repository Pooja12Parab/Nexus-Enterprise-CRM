import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/employees/route";
import { NextRequest } from "next/server";

vi.mock("@clerk/nextjs/server", () => ({
  auth: () =>
    Promise.resolve({
      userId: "user_hr1",
      sessionClaims: { role: "HR_MANAGER" },
    }),
  clerkClient: () => ({
    users: {
      getUser: () => Promise.resolve({ publicMetadata: { role: "HR_MANAGER" } }),
    },
  }),
}));

const mockFindMany = vi.fn();
const mockCount = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    employeeProfile: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      count: (...args: unknown[]) => mockCount(...args),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    $transaction: vi.fn().mockImplementation(
      (queries: [unknown, unknown]) => Promise.all(queries)
    ),
  },
}));

describe("GET /api/employees", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);
  });

  it("returns paginated data with meta", async () => {
    mockFindMany.mockResolvedValue([{ id: "1", firstName: "Test", department: { id: "d1", name: "Engineering" } }]);
    mockCount.mockResolvedValue(1);

    const req = new NextRequest(new URL("http://localhost:3000/api/employees?page=1&limit=50"));
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveProperty("data");
    expect(body.meta).toHaveProperty("totalCount", 1);
    expect(body.meta).toHaveProperty("page", 1);
    expect(body.meta).toHaveProperty("totalPages", 1);
  });

  it("returns 400 for invalid page", async () => {
    const req = new NextRequest(new URL("http://localhost:3000/api/employees?page=0"));
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("filters by department", async () => {
    mockFindMany.mockResolvedValue([
      { id: "1", firstName: "Alice", department: { id: "d1", name: "Engineering" } },
    ]);
    mockCount.mockResolvedValue(1);

    const req = new NextRequest(new URL("http://localhost:3000/api/employees?page=1&limit=50&dept=Engineering"));
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.length).toBe(1);
    expect(mockFindMany).toHaveBeenCalled();
    // Verify the where clause includes department name filter
    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.where.department.name).toBe("Engineering");
  });

  it("filters by status", async () => {
    mockFindMany.mockResolvedValue([
      { id: "1", firstName: "Bob", department: { id: "d1", name: "Sales" } },
    ]);
    mockCount.mockResolvedValue(1);

    const req = new NextRequest(new URL("http://localhost:3000/api/employees?page=1&limit=50&status=ACTIVE"));
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.length).toBe(1);
    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.where.status).toBe("ACTIVE");
  });

  it("sorts by lastName ascending by default", async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const req = new NextRequest(new URL("http://localhost:3000/api/employees?page=1&limit=50"));
    await GET(req);

    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.orderBy).toEqual({ lastName: "asc" });
  });

  it("sorts by lastName descending", async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(0);

    const req = new NextRequest(new URL("http://localhost:3000/api/employees?page=1&limit=50&sortBy=lastName&sortDir=desc"));
    await GET(req);

    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.orderBy).toEqual({ lastName: "desc" });
  });

  it("applies pagination skip/limit", async () => {
    mockFindMany.mockResolvedValue([]);
    mockCount.mockResolvedValue(100);

    const req = new NextRequest(new URL("http://localhost:3000/api/employees?page=3&limit=25"));
    await GET(req);

    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.skip).toBe(50); // (3-1) * 25
    expect(callArgs.take).toBe(25);
  });

  it("searches by name", async () => {
    mockFindMany.mockResolvedValue([
      { id: "1", firstName: "Marcus", lastName: "Smith", department: { id: "d1", name: "Engineering" } },
    ]);
    mockCount.mockResolvedValue(1);

    const req = new NextRequest(new URL("http://localhost:3000/api/employees?page=1&limit=50&search=Marcus"));
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.length).toBe(1);
    const callArgs = mockFindMany.mock.calls[0][0];
    expect(callArgs.where.OR).toHaveLength(4);
    expect(callArgs.where.OR[0]).toEqual({ firstName: { contains: "Marcus", mode: "insensitive" } });
    expect(callArgs.where.OR[1]).toEqual({ lastName: { contains: "Marcus", mode: "insensitive" } });
    expect(callArgs.where.OR[2]).toEqual({ employeeId: { contains: "Marcus", mode: "insensitive" } });
    expect(callArgs.where.OR[3]).toEqual({ jobTitle: { contains: "Marcus", mode: "insensitive" } });
  });
});

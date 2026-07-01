import { describe, it, expect, vi } from "vitest";
import { GET } from "@/app/api/employees/route";
import { NextRequest } from "next/server";

vi.mock("@clerk/nextjs/server", () => ({
  auth: () =>
    Promise.resolve({
      userId: "user_hr1",
      sessionClaims: { role: "HR_MANAGER" },
    }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    employeeProfile: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
    },
    $transaction: vi.fn().mockResolvedValue([[], 0]),
  },
}));

describe("GET /api/employees", () => {
  it("returns paginated data with meta", async () => {
    const req = new NextRequest(new URL("http://localhost:3000/api/employees?page=1&limit=50"));
    const res = await GET(req);
    const body = await res.json();
    // Debug: log body if test fails
    if (res.status !== 200) {
      console.log("Response body:", JSON.stringify(body));
    }
    expect(res.status).toBe(200);
    expect(body).toHaveProperty("data");
    expect(body.meta).toHaveProperty("totalCount");
    expect(body.meta).toHaveProperty("page");
    expect(body.meta).toHaveProperty("totalPages");
  });

  it("returns 400 for invalid page", async () => {
    const req = new NextRequest(new URL("http://localhost:3000/api/employees?page=0"));
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});

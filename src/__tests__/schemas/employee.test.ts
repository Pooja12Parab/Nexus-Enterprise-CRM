import { describe, it, expect } from "vitest";
import { employeeQuerySchema, employeeUpdateSchema } from "@/shared/schemas/employee";

describe("employeeQuerySchema", () => {
  it("accepts empty params with defaults", () => {
    const result = employeeQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.sortBy).toBe("lastName");
      expect(result.data.sortDir).toBe("asc");
      expect(result.data.limit).toBe(50);
    }
  });

  it("accepts valid query params", () => {
    const result = employeeQuerySchema.safeParse({
      page: "3",
      dept: "Engineering",
      status: "ACTIVE",
      search: "Marcus",
      sortBy: "firstName",
      sortDir: "desc",
      limit: "25",
    });
    expect(result.success).toBe(true);
  });

  it("coerces page number from string", () => {
    const result = employeeQuerySchema.safeParse({ page: "5" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.page).toBe(5);
  });

  it("rejects page below 1", () => {
    const result = employeeQuerySchema.safeParse({ page: "0" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid sort direction", () => {
    const result = employeeQuerySchema.safeParse({ sortDir: "up" });
    expect(result.success).toBe(false);
  });

  it("accepts any status string", () => {
    const result = employeeQuerySchema.safeParse({ status: "RETIRED" });
    expect(result.success).toBe(true); // validated at API handler level
  });

  it("accepts limit within bounds", () => {
    const result = employeeQuerySchema.safeParse({ limit: "25" });
    expect(result.success).toBe(true);
  });

  it("rejects limit over 100", () => {
    const result = employeeQuerySchema.safeParse({ limit: "200" });
    expect(result.success).toBe(false);
  });
});

describe("employeeUpdateSchema", () => {
  it("accepts partial updates", () => {
    const result = employeeUpdateSchema.safeParse({ jobTitle: "Staff Engineer" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = employeeUpdateSchema.safeParse({ status: "FIRED" });
    expect(result.success).toBe(false);
  });

  it("accepts valid status update", () => {
    const result = employeeUpdateSchema.safeParse({ status: "INACTIVE" });
    expect(result.success).toBe(true);
  });
});

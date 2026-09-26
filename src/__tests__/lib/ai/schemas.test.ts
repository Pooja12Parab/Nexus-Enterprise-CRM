import { describe, it, expect } from "vitest";
import { searchQuerySchema, onboardingSummaryInputSchema } from "@/lib/ai/schemas";

describe("searchQuerySchema", () => {
  it("accepts empty input", () => {
    const result = searchQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts a valid search", () => {
    const result = searchQuerySchema.safeParse({
      search: "Marcus",
      dept: "Engineering",
      status: "ACTIVE",
      page: 1,
      limit: 50,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid dept", () => {
    const result = searchQuerySchema.safeParse({ dept: "NotADepartment" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid status", () => {
    const result = searchQuerySchema.safeParse({ status: "FIRE_EVERYONE" });
    expect(result.success).toBe(false);
  });

  it("rejects limit > 100", () => {
    const result = searchQuerySchema.safeParse({ limit: 999 });
    expect(result.success).toBe(false);
  });
});

describe("onboardingSummaryInputSchema", () => {
  it("requires firstName, lastName, jobTitle, department", () => {
    const result = onboardingSummaryInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("accepts minimum required fields", () => {
    const result = onboardingSummaryInputSchema.safeParse({
      firstName: "Ava",
      lastName: "Singh",
      jobTitle: "Engineer",
      department: "Engineering",
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional managerName and startDate", () => {
    const result = onboardingSummaryInputSchema.safeParse({
      firstName: "Ava",
      lastName: "Singh",
      jobTitle: "Engineer",
      department: "Engineering",
      managerName: "Jordan Avery",
      startDate: "2026-04-01",
    });
    expect(result.success).toBe(true);
  });
});

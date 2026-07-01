import { describe, it, expect } from "vitest";
import { onboardingSchema } from "@/shared/schemas/onboarding";

describe("onboardingSchema", () => {
  const valid = {
    firstName: "Marcus",
    lastName: "Chen",
    departmentId: "550e8400-e29b-41d4-a716-446655440000",
    jobTitle: "Senior Engineer",
    salaryAmount: 135000,
  };

  it("accepts valid data", () => {
    expect(onboardingSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects salary below minimum", () => {
    const result = onboardingSchema.safeParse({ ...valid, salaryAmount: 30000 });
    expect(result.success).toBe(false);
  });

  it("rejects salary above maximum", () => {
    const result = onboardingSchema.safeParse({ ...valid, salaryAmount: 600000 });
    expect(result.success).toBe(false);
  });

  it("rejects short first name", () => {
    const result = onboardingSchema.safeParse({ ...valid, firstName: "A" });
    expect(result.success).toBe(false);
  });

  it("rejects short last name", () => {
    const result = onboardingSchema.safeParse({ ...valid, lastName: "B" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid department ID", () => {
    const result = onboardingSchema.safeParse({ ...valid, departmentId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("rejects short job title", () => {
    const result = onboardingSchema.safeParse({ ...valid, jobTitle: "AB" });
    expect(result.success).toBe(false);
  });

  it("accepts optional fields", () => {
    const result = onboardingSchema.safeParse({
      ...valid,
      managerId: "550e8400-e29b-41d4-a716-446655440001",
      startDate: new Date(),
      email: "marcus@nexus.internal",
      phoneNumber: "+15551234567",
      location: "San Francisco",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = onboardingSchema.safeParse({ ...valid, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const result = onboardingSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

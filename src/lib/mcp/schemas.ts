import { z } from "zod";

export const empStatusEnum = z.enum(["ACTIVE", "ONBOARDING", "LEAVE", "INACTIVE"]);

export const departmentEnum = z.enum([
  "Engineering",
  "Marketing",
  "Finance",
  "Sales",
  "HR",
  "Operations",
  "Design",
]);

export const listEmployeesInput = z.object({
  department: departmentEnum.optional().describe("Filter by department name"),
  status: empStatusEnum.optional().describe("Filter by employment status"),
  search: z.string().optional().describe("Substring match against name, email, job title"),
  limit: z.number().int().min(1).max(100).optional().default(50).describe("Max results to return"),
});

export const searchEmployeesInput = z.object({
  query: z.string().min(2).max(200).describe("Search query — matches name, email, job title"),
  limit: z.number().int().min(1).max(100).optional().default(25),
});

export const countByDepartmentInput = z.object({
  status: empStatusEnum.optional().describe("Optional: only count employees with this status"),
});

export const getEmployeeInput = z.object({
  id: z.string().min(1).describe("Employee ID (cuid format)"),
});

export const onboardingPromptInput = z.object({
  department: z.string().min(1).describe("Department name"),
  role: z.string().min(1).describe("Job title"),
});

export type ListEmployeesInput = z.infer<typeof listEmployeesInput>;
export type SearchEmployeesInput = z.infer<typeof searchEmployeesInput>;
export type CountByDepartmentInput = z.infer<typeof countByDepartmentInput>;
export type GetEmployeeInput = z.infer<typeof getEmployeeInput>;
export type OnboardingPromptInput = z.infer<typeof onboardingPromptInput>;

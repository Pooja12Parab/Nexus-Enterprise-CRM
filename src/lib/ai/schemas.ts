import { z } from "zod";

export const empStatusEnum = z.enum(["ACTIVE", "ONBOARDING", "LEAVE", "INACTIVE"]);

export const searchQuerySchema = z.object({
  search: z.string().optional().describe("Free-text search across name, email, job title"),
  dept: z
    .enum(["Engineering", "Marketing", "Finance", "Sales", "HR", "Operations", "Design"])
    .optional()
    .describe("Department filter"),
  status: empStatusEnum.optional().describe("Employment status filter"),
  sortBy: z.enum(["lastName", "firstName", "department", "hireDate"]).optional(),
  sortDir: z.enum(["asc", "desc"]).optional(),
  page: z.number().int().positive().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;

export const onboardingSummaryInputSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  jobTitle: z.string().min(1),
  department: z.string().min(1),
  managerName: z.string().optional(),
  startDate: z.string().optional(),
});

export const onboardingSummaryOutputSchema = z.object({
  summary: z.string().describe("2-3 sentence welcome blurb"),
});

export type OnboardingSummaryInput = z.infer<typeof onboardingSummaryInputSchema>;
export type OnboardingSummaryOutput = z.infer<typeof onboardingSummaryOutputSchema>;

export const searchInputSchema = z.object({
  query: z.string().min(3).max(500),
});

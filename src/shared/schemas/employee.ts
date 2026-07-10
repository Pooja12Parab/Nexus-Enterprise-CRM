import { z } from "zod";

export const employeeQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  dept: z.string().nullish().default("All"),
  status: z.string().nullish().default("All"),
  search: z.string().nullish().default(""),
  sortBy: z.enum(["firstName", "lastName", "jobTitle", "status", "createdAt", "employeeId"]).nullish().default("lastName"),
  sortDir: z.enum(["asc", "desc"]).nullish().default("asc"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type EmployeeQuery = z.infer<typeof employeeQuerySchema>;

export const employeeUpdateSchema = z.object({
  jobTitle: z.string().min(3).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ONBOARDING", "LEAVE"]).optional(),
  departmentId: z.string().uuid().optional(),
  location: z.string().optional(),
  phoneNumber: z.string().optional(),
});

export type EmployeeUpdate = z.infer<typeof employeeUpdateSchema>;

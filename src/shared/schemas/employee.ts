import { z } from "zod";

export const employeeQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  dept: z.string().optional(),
  status: z.string().optional(),
  search: z.string().min(1).optional(),
  sortBy: z.enum(["firstName", "lastName", "jobTitle", "status", "createdAt", "employeeId"]).default("lastName"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
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

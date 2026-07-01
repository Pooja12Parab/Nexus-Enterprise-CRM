import { z } from "zod";

export const onboardingSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters").max(50),
  lastName: z.string().min(2, "Last name must be at least 2 characters").max(50),
  departmentId: z.string().uuid("Invalid department ID"),
  jobTitle: z.string().min(3, "Job title must be at least 3 characters"),
  salaryAmount: z.number().min(40000, "Minimum salary is $40,000").max(500000, "Maximum salary is $500,000"),
  managerId: z.string().uuid().optional(),
  startDate: z.date().optional(),
  email: z.string().email("Invalid email address").optional(),
  phoneNumber: z.string().min(10, "Phone number too short").max(15).optional(),
  location: z.string().min(2).optional(),
});

export type OnboardingData = z.infer<typeof onboardingSchema>;

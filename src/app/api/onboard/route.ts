import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, unauthorizedResponse, forbiddenResponse } from "@/lib/api-utils";
import { onboardingSchema } from "@/shared/schemas/onboarding";
import { auth } from "@clerk/nextjs/server";

export async function POST(request: Request) {
  try {
    const { userId, sessionClaims } = await auth();

    if (!userId) return unauthorizedResponse();

    const role = sessionClaims?.role as string | undefined;
    if (role !== "HR_MANAGER" && role !== "SUPER_ADMIN") {
      return forbiddenResponse();
    }

    const body = await request.json();
    const parsed = onboardingSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Validation failed", details: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Generate sequential employee ID
      const lastEmployee = await tx.employeeProfile.findFirst({
        orderBy: { employeeId: "desc" },
        select: { employeeId: true },
      });
      const lastNumber = lastEmployee ? parseInt(lastEmployee.employeeId.replace("EMP-", "")) : 0;
      const employeeId = `EMP-${String(lastNumber + 1).padStart(3, "0")}`;

      const profile = await tx.employeeProfile.create({
        data: {
          employeeId,
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          departmentId: parsed.data.departmentId,
          jobTitle: parsed.data.jobTitle,
          status: "ONBOARDING",
          managerId: parsed.data.managerId,
          hireDate: parsed.data.startDate ?? new Date(),
          phoneNumber: parsed.data.phoneNumber,
          location: parsed.data.location,
          salaries: {
            create: {
              amount: parsed.data.salaryAmount,
              effectiveDate: new Date(),
            },
          },
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: "EMPLOYEE_CREATED",
          targetId: profile.id,
          metadata: { employeeId, departmentId: parsed.data.departmentId },
        },
      });

      return profile;
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

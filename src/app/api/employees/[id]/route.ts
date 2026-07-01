import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, unauthorizedResponse, forbiddenResponse } from "@/lib/api-utils";
import { auth } from "@clerk/nextjs/server";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await auth();
    if (!userId) return unauthorizedResponse();

    const { id } = await params;

    const employee = await prisma.employeeProfile.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true } },
        user: { select: { email: true, role: true } },
        salaries: { orderBy: { effectiveDate: "desc" }, take: 5 },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            jobTitle: true,
            department: { select: { name: true } },
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Employee not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: employee });
  } catch (error) {
    return handleApiError(error);
  }
}

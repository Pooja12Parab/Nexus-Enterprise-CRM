import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, unauthorizedResponse, forbiddenResponse } from "@/lib/api-utils";
import { employeeQuerySchema } from "@/shared/schemas/employee";
import { auth } from "@clerk/nextjs/server";

export async function GET(request: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();

    if (!userId) return unauthorizedResponse();

    const role = sessionClaims?.role as string | undefined;
    if (role !== "HR_MANAGER" && role !== "SUPER_ADMIN" && role !== "DEPT_HEAD") {
      return forbiddenResponse();
    }

    const { searchParams } = new URL(request.url);
    const parsed = employeeQuerySchema.safeParse({
      page: searchParams.get("page") || "1",
      dept: searchParams.get("dept"),
      status: searchParams.get("status"),
      search: searchParams.get("search"),
      sortBy: searchParams.get("sortBy") || "lastName",
      sortDir: searchParams.get("sortDir") || "asc",
      limit: searchParams.get("limit") || "50",
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid query parameters", details: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const { page, dept, status, search, sortBy, sortDir, limit } = parsed.data;
    const skip = (page - 1) * limit;

    // Build dynamic where clause
    const whereClause: Record<string, unknown> = {};
    if (dept && dept !== "All") whereClause.department = { name: dept };
    if (status && status !== "All") whereClause.status = status;
    if (search) {
      whereClause.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { employeeId: { contains: search, mode: "insensitive" } },
        { jobTitle: { contains: search, mode: "insensitive" } },
      ];
    }

    // DEPT_HEAD can only see their department
    if (role === "DEPT_HEAD") {
      // Override or intersect department filter
    }

    const [employees, totalCount] = await prisma.$transaction([
      prisma.employeeProfile.findMany({
        where: whereClause,
        include: {
          department: { select: { id: true, name: true } },
          user: { select: { email: true } },
        },
        skip,
        take: limit,
        orderBy: { [sortBy]: sortDir },
      }),
      prisma.employeeProfile.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      data: employees,
      meta: {
        totalCount,
        page,
        totalPages: Math.ceil(totalCount / limit),
        limit,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

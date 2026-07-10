import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError, unauthorizedResponse, forbiddenResponse, resolveRole } from "@/lib/api-utils";
import { employeeQuerySchema } from "@/shared/schemas/employee";
import { auth } from "@clerk/nextjs/server";

export async function GET(request: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();

    if (!userId) return unauthorizedResponse();

    const role = await resolveRole(userId, sessionClaims);
    if (role !== "HR_MANAGER" && role !== "SUPER_ADMIN" && role !== "DEPT_HEAD") {
      return forbiddenResponse();
    }

    const { searchParams } = new URL(request.url);
    const parsed = employeeQuerySchema.safeParse({
      page: searchParams.get("page"),
      dept: searchParams.get("dept"),
      status: searchParams.get("status"),
      search: searchParams.get("search"),
      sortBy: searchParams.get("sortBy"),
      sortDir: searchParams.get("sortDir"),
      limit: searchParams.get("limit"),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Invalid query parameters", details: parsed.error.flatten().fieldErrors } },
        { status: 400 }
      );
    }

    const { page, dept, status, search, sortBy, sortDir, limit } = parsed.data;
    const skip = (page - 1) * limit;
    const orderField = sortBy ?? "lastName";
    const orderDirection = sortDir ?? "asc";

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
      const userEmail = sessionClaims?.email as string | undefined;
      if (userEmail) {
        const userRecord = await prisma.user.findUnique({
          where: { email: userEmail },
          select: {
            profile: {
              select: {
                department: { select: { name: true } },
              },
            },
          },
        });
        const deptName = userRecord?.profile?.department?.name;
        if (deptName) {
          whereClause.department = { name: deptName };
        }
      }
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
        orderBy: { [orderField]: orderDirection },
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

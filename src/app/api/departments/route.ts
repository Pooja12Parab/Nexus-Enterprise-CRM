import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-utils";
import type { DepartmentOption } from "@/shared/types";

export async function GET() {
  try {
    const departments = await prisma.department.findMany({
      include: {
        _count: { select: { employees: true } },
      },
      orderBy: { name: "asc" },
    });

    const result: DepartmentOption[] = departments.map((d) => ({
      id: d.id,
      name: d.name,
      employeeCount: d._count.employees,
    }));

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

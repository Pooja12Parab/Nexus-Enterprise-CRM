import { tool } from "ai";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const aiTools = {
  listEmployees: tool({
    description:
      "List employees matching the given filters. Returns at most 50 employees with their name, title, department, and status.",
    inputSchema: z.object({
      department: z.string().optional().describe("Filter by department name"),
      status: z
        .enum(["ACTIVE", "ONBOARDING", "LEAVE", "INACTIVE"])
        .optional()
        .describe("Filter by employment status"),
      search: z.string().optional().describe("Search by name, email, or job title"),
    }),
    execute: async ({ department, status, search }) => {
      const where: Record<string, unknown> = {};
      if (department) where.department = { name: department };
      if (status) where.status = status;
      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { jobTitle: { contains: search, mode: "insensitive" } },
        ];
      }
      const employees = await prisma.employeeProfile.findMany({
        where,
        include: { department: { select: { name: true } } },
        take: 50,
        orderBy: { lastName: "asc" },
      });
      return employees.map((e) => ({
        id: e.id,
        name: `${e.firstName} ${e.lastName}`,
        title: e.jobTitle ?? null,
        department: e.department.name,
        status: e.status,
      }));
    },
  }),

  countByDepartment: tool({
    description:
      "Count how many employees are in each department. Use this when the user asks for breakdowns or distribution.",
    inputSchema: z.object({
      status: z
        .enum(["ACTIVE", "ONBOARDING", "LEAVE", "INACTIVE"])
        .optional()
        .describe("Optional: only count employees with this status"),
    }),
    execute: async ({ status }) => {
      const groups = await prisma.employeeProfile.groupBy({
        by: ["departmentId"],
        where: status ? { status } : undefined,
        _count: { _all: true },
      });
      const departments = await prisma.department.findMany({
        where: { id: { in: groups.map((g) => g.departmentId) } },
      });
      const map = new Map(departments.map((d) => [d.id, d.name]));
      return groups.map((g) => ({
        department: map.get(g.departmentId) ?? "Unknown",
        count: g._count._all,
      }));
    },
  }),

  listDepartments: tool({
    description: "List all departments in the company with their employee counts.",
    inputSchema: z.object({}),
    execute: async () => {
      const departments = await prisma.department.findMany({
        include: { _count: { select: { employees: true } } },
        orderBy: { name: "asc" },
      });
      return departments.map((d) => ({
        name: d.name,
        employeeCount: d._count.employees,
      }));
    },
  }),

  getEmployeeStats: tool({
    description:
      "Get aggregate stats about the workforce: total employees, counts by status, total departments. Use for high-level questions like 'how many people work here?' or 'how many are on leave?'",
    inputSchema: z.object({}),
    execute: async () => {
      const [total, byStatus, deptCount] = await Promise.all([
        prisma.employeeProfile.count(),
        prisma.employeeProfile.groupBy({ by: ["status"], _count: { _all: true } }),
        prisma.department.count(),
      ]);
      return {
        total,
        byStatus: Object.fromEntries(
          byStatus.map((s) => [s.status, s._count._all])
        ),
        departmentCount: deptCount,
      };
    },
  }),
};

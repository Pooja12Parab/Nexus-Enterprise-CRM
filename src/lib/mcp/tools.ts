import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  countByDepartmentInput,
  getEmployeeInput,
  listEmployeesInput,
  searchEmployeesInput,
} from "./schemas";

/**
 * Register all MCP tools on the server.
 * Tools call Prisma directly — they share the same DB as the rest of the CRM.
 */
export function registerTools(server: McpServer) {
  server.registerTool(
    "list_employees",
    {
      title: "List Employees",
      description:
        "List employees with optional filters. Returns up to 100 employees with name, title, department, and status.",
      inputSchema: listEmployeesInput.shape,
    },
    async (args: { department?: string; status?: string; search?: string; limit?: number }) => {
      const where: Record<string, unknown> = {};
      if (args.department) where.department = { name: args.department };
      if (args.status) where.status = args.status;
      if (args.search) {
        where.OR = [
          { firstName: { contains: args.search, mode: "insensitive" } },
          { lastName: { contains: args.search, mode: "insensitive" } },
          { jobTitle: { contains: args.search, mode: "insensitive" } },
        ];
      }
      const employees = await prisma.employeeProfile.findMany({
        where,
        include: { department: { select: { name: true } } },
        take: args.limit ?? 50,
        orderBy: { lastName: "asc" },
      });
      const payload = employees.map((e) => ({
        id: e.id,
        name: `${e.firstName} ${e.lastName}`,
        title: e.jobTitle,
        department: e.department.name,
        status: e.status,
        hireDate: e.hireDate,
      }));
      return {
        content: [
          { type: "text", text: JSON.stringify(payload, null, 2) },
        ],
      };
    }
  );

  server.registerTool(
    "search_employees",
    {
      title: "Search Employees",
      description:
        "Search employees by free-text query. Matches against name and job title.",
      inputSchema: searchEmployeesInput.shape,
    },
    async (args: { query: string; limit?: number }) => {
      const q = args.query;
      const employees = await prisma.employeeProfile.findMany({
        where: {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { jobTitle: { contains: q, mode: "insensitive" } },
          ],
        },
        include: { department: { select: { name: true } } },
        take: args.limit ?? 25,
        orderBy: { lastName: "asc" },
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              employees.map((e) => ({
                id: e.id,
                name: `${e.firstName} ${e.lastName}`,
                title: e.jobTitle,
                department: e.department.name,
                status: e.status,
              })),
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerTool(
    "count_by_department",
    {
      title: "Count Employees by Department",
      description:
        "Count how many employees are in each department. Optionally filter by employment status.",
      inputSchema: countByDepartmentInput.shape,
    },
    async (args: { status?: string }) => {
      const groups = await prisma.employeeProfile.groupBy({
        by: ["departmentId"],
        where: args.status
          ? { status: args.status as "ACTIVE" | "INACTIVE" | "ONBOARDING" | "LEAVE" }
          : undefined,
        _count: { _all: true },
      });
      const departments = await prisma.department.findMany({
        where: { id: { in: groups.map((g) => g.departmentId) } },
      });
      const map = new Map(departments.map((d) => [d.id, d.name]));
      const result = groups
        .map((g) => ({
          department: map.get(g.departmentId) ?? "Unknown",
          count: g._count._all,
        }))
        .sort((a, b) => b.count - a.count);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.registerTool(
    "get_employee",
    {
      title: "Get Employee by ID",
      description: "Fetch a single employee by their ID. Returns full profile data.",
      inputSchema: getEmployeeInput.shape,
    },
    async (args: { id: string }) => {
      const employee = await prisma.employeeProfile.findUnique({
        where: { id: args.id },
        include: { department: { select: { name: true } } },
      });
      if (!employee) {
        return {
          content: [{ type: "text", text: `No employee found with id ${args.id}` }],
          isError: true,
        };
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                id: employee.id,
                name: `${employee.firstName} ${employee.lastName}`,
                title: employee.jobTitle,
                department: employee.department.name,
                status: employee.status,
                hireDate: employee.hireDate,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.registerTool(
    "get_employee_stats",
    {
      title: "Get Workforce Stats",
      description:
        "Get aggregate workforce statistics: total employees, counts by status, total departments.",
      inputSchema: { },
    },
    async () => {
      const [total, byStatus, deptCount] = await Promise.all([
        prisma.employeeProfile.count(),
        prisma.employeeProfile.groupBy({ by: ["status"], _count: { _all: true } }),
        prisma.department.count(),
      ]);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                total,
                byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])),
                departmentCount: deptCount,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}

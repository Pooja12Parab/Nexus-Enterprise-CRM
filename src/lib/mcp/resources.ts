import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { prisma } from "@/lib/prisma";

export function registerResources(server: McpServer) {
  server.registerResource(
    "workforce-summary",
    "crm://stats/summary",
    {
      title: "Workforce Summary",
      description:
        "Real-time workforce statistics: total employees, by-status counts, department breakdown.",
      mimeType: "application/json",
    },
    async (uri) => {
      const [total, byStatus, deptGroups] = await Promise.all([
        prisma.employeeProfile.count(),
        prisma.employeeProfile.groupBy({ by: ["status"], _count: { _all: true } }),
        prisma.employeeProfile.groupBy({
          by: ["departmentId"],
          _count: { _all: true },
        }),
      ]);
      const departments = await prisma.department.findMany({
        where: { id: { in: deptGroups.map((g) => g.departmentId) } },
      });
      const nameMap = new Map(departments.map((d) => [d.id, d.name]));
      const payload = {
        total,
        byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])),
        byDepartment: deptGroups
          .map((g) => ({
            department: nameMap.get(g.departmentId) ?? "Unknown",
            count: g._count._all,
          }))
          .sort((a, b) => b.count - a.count),
        fetchedAt: new Date().toISOString(),
      };
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(payload, null, 2),
          },
        ],
      };
    }
  );

  server.registerResource(
    "departments",
    "crm://departments",
    {
      title: "Departments List",
      description: "All departments with their current employee counts.",
      mimeType: "application/json",
    },
    async (uri) => {
      const departments = await prisma.department.findMany({
        include: { _count: { select: { employees: true } } },
        orderBy: { name: "asc" },
      });
      const payload = departments.map((d) => ({
        id: d.id,
        name: d.name,
        employeeCount: d._count.employees,
      }));
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(payload, null, 2),
          },
        ],
      };
    }
  );
}

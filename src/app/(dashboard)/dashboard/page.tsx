import { Card, CardContent } from "@/components/ui/Card";
import { Users, UserPlus, TrendingUp, Building2 } from "lucide-react";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  // Fetch real stats from Prisma — no more hardcoded fake numbers.
  const [
    totalEmployees,
    onboardingCount,
    activeCount,
    onLeaveCount,
    inactiveCount,
    departments,
    recentEmployees,
    deptCounts,
  ] = await Promise.all([
    prisma.employeeProfile.count(),
    prisma.employeeProfile.count({ where: { status: "ONBOARDING" } }),
    prisma.employeeProfile.count({ where: { status: "ACTIVE" } }),
    prisma.employeeProfile.count({ where: { status: "LEAVE" } }),
    prisma.employeeProfile.count({ where: { status: "INACTIVE" } }),
    prisma.department.count(),
    prisma.employeeProfile.findMany({
      orderBy: { hireDate: "desc" },
      take: 5,
      include: { department: { select: { name: true } } },
    }),
    prisma.employeeProfile.groupBy({
      by: ["departmentId"],
      _count: { _all: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),
  ]);

  const deptNames = await prisma.department.findMany({
    where: { id: { in: deptCounts.map((d) => d.departmentId) } },
  });
  const nameById = new Map(deptNames.map((d) => [d.id, d.name]));
  const topDepts = deptCounts.map((c) => ({
    dept: nameById.get(c.departmentId) ?? "Unknown",
    count: c._count._all,
    pct: Math.round((c._count._all / Math.max(totalEmployees, 1)) * 100),
  }));

  const turnoverRate =
    totalEmployees > 0
      ? ((onLeaveCount + inactiveCount) / totalEmployees * 100).toFixed(1)
      : "0.0";

  const stats = [
    {
      label: "Total Employees",
      value: totalEmployees.toString(),
      icon: Users,
      trend: `${activeCount} active`,
      color: "text-nexus-600",
    },
    {
      label: "Onboarding",
      value: onboardingCount.toString(),
      icon: UserPlus,
      trend: `${onboardingCount} in progress`,
      color: "text-yellow-600",
    },
    {
      label: "Departments",
      value: departments.toString(),
      icon: Building2,
      trend: "All active",
      color: "text-green-600",
    },
    {
      label: "Inactive + On Leave",
      value: `${turnoverRate}%`,
      icon: TrendingUp,
      trend: `${onLeaveCount} on leave, ${inactiveCount} inactive`,
      color: "text-purple-600",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of your HR operations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{stat.trend}</p>
                  </div>
                  <div className={`rounded-lg bg-gray-50 p-2.5 ${stat.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="p-6 pb-3">
            <h2 className="text-base font-semibold text-gray-900">Recent Hires</h2>
          </div>
          <CardContent>
            <div className="space-y-3">
              {recentEmployees.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">No employees yet</p>
              ) : (
                recentEmployees.map((e) => {
                  const hire = e.hireDate ?? new Date();
                  const days = Math.max(
                    1,
                    Math.floor((Date.now() - hire.getTime()) / (1000 * 60 * 60 * 24))
                  );
                  return (
                    <div
                      key={e.id}
                      className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {e.firstName} {e.lastName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {e.jobTitle} · {e.department.name}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400">
                        {days === 1 ? "today" : `${days} days ago`}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <div className="p-6 pb-3">
            <h2 className="text-base font-semibold text-gray-900">Top Departments</h2>
          </div>
          <CardContent>
            <div className="space-y-3">
              {topDepts.length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">No departments yet</p>
              ) : (
                topDepts.map(({ dept, count, pct }) => (
                  <div key={dept}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-600">{dept}</span>
                      <span className="text-sm text-gray-500">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-nexus-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Users, UserPlus, TrendingUp, Building2 } from "lucide-react";

export default function DashboardPage() {
  const stats = [
    { label: "Total Employees", value: "515", icon: Users, trend: "+12 this month", color: "text-nexus-600" },
    { label: "Onboarding", value: "42", icon: UserPlus, trend: "8 in progress", color: "text-yellow-600" },
    { label: "Departments", value: "8", icon: Building2, trend: "All active", color: "text-green-600" },
    { label: "Turnover Rate", value: "3.2%", icon: TrendingUp, trend: "-0.5% vs last quarter", color: "text-purple-600" },
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
          <CardHeader>
            <h2 className="text-base font-semibold text-gray-900">Recent Onboarding</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: "James Wilson", role: "Junior Engineer", dept: "Engineering", days: "2 days ago" },
                { name: "Sarah Mitchell", role: "Product Designer", dept: "Design", days: "3 days ago" },
                { name: "Robert Chen", role: "Data Analyst", dept: "Product", days: "5 days ago" },
              ].map((item) => (
                <div key={item.name} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.role} · {item.dept}</p>
                  </div>
                  <span className="text-xs text-gray-400">{item.days}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-gray-900">Department Distribution</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { dept: "Engineering", count: 212, pct: 41 },
                { dept: "Product", count: 85, pct: 17 },
                { dept: "Design", count: 62, pct: 12 },
                { dept: "Sales", count: 55, pct: 11 },
                { dept: "Marketing", count: 43, pct: 8 },
              ].map(({ dept, count, pct }) => (
                <div key={dept}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600">{dept}</span>
                    <span className="text-sm text-gray-500">{count} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-nexus-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

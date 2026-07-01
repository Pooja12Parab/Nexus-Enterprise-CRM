import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Shield, Bell, Database, Building2 } from "lucide-react";

const settingsSections = [
  {
    title: "Organization",
    description: "Manage company-wide settings and departments",
    icon: Building2,
    items: ["Company Profile", "Departments", "Holiday Calendar"],
  },
  {
    title: "Security",
    description: "Configure authentication and access control",
    icon: Shield,
    items: ["SSO Configuration", "Role Permissions", "Audit Logs"],
  },
  {
    title: "Notifications",
    description: "Email and in-app notification preferences",
    icon: Bell,
    items: ["Email Templates", "Notification Rules", "Reminders"],
  },
  {
    title: "Data Management",
    description: "Import, export, and data retention policies",
    icon: Database,
    items: ["Import Employees", "Export Data", "Data Retention"],
  },
];

export default function SettingsPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your organization settings</p>
      </div>

      <div className="grid gap-4">
        {settingsSections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-gray-50 p-2.5">
                    <Icon className="h-5 w-5 text-nexus-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-gray-900">{section.title}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{section.description}</p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {section.items.map((item) => (
                        <button key={item} className="btn-secondary text-xs py-1.5">
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { GitBranch, Users } from "lucide-react";

const orgData = [
  {
    name: "CEO",
    children: [
      {
        name: "VP Engineering",
        children: [
          { name: "Engineering Manager", children: [{ name: "Engineers" }] },
          { name: "QA Lead" },
        ],
      },
      {
        name: "VP Product",
        children: [
          { name: "Product Manager" },
          { name: "Design Lead" },
        ],
      },
      {
        name: "VP Sales",
        children: [
          { name: "Sales Director" },
          { name: "Account Managers" },
        ],
      },
      { name: "Head of HR" },
      { name: "CFO" },
    ],
  },
];

export default function OrgChartPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Organization Chart</h1>
        <p className="text-sm text-gray-500 mt-1">Company structure and reporting lines</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-nexus-600" />
            <h2 className="text-base font-semibold text-gray-900">Hierarchy View</h2>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="space-y-4">
              <div className="flex justify-center">
                <OrgNode label="CEO" />
              </div>
              <div className="h-8 border-l-2 border-gray-300 mx-auto w-0" />
              <div className="grid grid-cols-5 gap-4">
                <OrgNode label="VP Engineering" />
                <OrgNode label="VP Product" />
                <OrgNode label="VP Sales" />
                <OrgNode label="Head of HR" />
                <OrgNode label="CFO" />
              </div>
              <div className="flex justify-center gap-8">
                <div className="space-y-4">
                  <div className="h-4 border-l-2 border-gray-300 mx-auto w-0" />
                  <OrgNode label="Eng. Manager" />
                  <div className="flex gap-2">
                    <OrgNode label="Engineers" size="sm" />
                    <OrgNode label="QA Lead" size="sm" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="h-4 border-l-2 border-gray-300 mx-auto w-0" />
                  <OrgNode label="Product Manager" />
                  <OrgNode label="Design Lead" size="sm" />
                </div>
                <div className="space-y-4">
                  <div className="h-4 border-l-2 border-gray-300 mx-auto w-0" />
                  <OrgNode label="Sales Director" />
                  <OrgNode label="Account Mgrs" size="sm" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function OrgNode({ label, size = "md" }: { label: string; size?: "sm" | "md" }) {
  return (
    <div className="flex flex-col items-center">
      <div className={`rounded-lg border-2 border-gray-200 bg-white shadow-sm px-4 ${size === "sm" ? "py-1.5" : "py-2"}`}>
        <div className="flex items-center gap-2">
          <div className={`rounded-full bg-nexus-100 flex items-center justify-center ${size === "sm" ? "h-5 w-5" : "h-6 w-6"}`}>
            <Users className={size === "sm" ? "h-3 w-3 text-nexus-600" : "h-3.5 w-3.5 text-nexus-600"} />
          </div>
          <span className={`font-medium text-gray-900 ${size === "sm" ? "text-xs" : "text-sm"}`}>{label}</span>
        </div>
      </div>
    </div>
  );
}

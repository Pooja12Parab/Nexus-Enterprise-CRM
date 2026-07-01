"use client";

import { useFormContext } from "react-hook-form";
import type { OnboardingData } from "@/shared/schemas/onboarding";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import { useDepartments } from "@/hooks/use-departments";
import { CheckCircle } from "lucide-react";

export function ReviewSignStep() {
  const { getValues } = useFormContext<OnboardingData>();
  const { data: departments } = useDepartments();
  const values = getValues();

  const deptName = departments?.find((d) => d.id === values.departmentId)?.name || "—";

  const fields = [
    { label: "First Name", value: values.firstName || "—" },
    { label: "Last Name", value: values.lastName || "—" },
    { label: "Email", value: values.email || "—" },
    { label: "Phone", value: values.phoneNumber || "—" },
    { label: "Location", value: values.location || "—" },
    { label: "Department", value: deptName },
    { label: "Job Title", value: values.jobTitle || "—" },
    { label: "Salary", value: values.salaryAmount ? formatCurrency(values.salaryAmount) : "—" },
    { label: "Start Date", value: values.startDate ? new Date(values.startDate).toLocaleDateString() : "—" },
  ];

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-gray-900">Review & Submit</h2>
        <p className="text-sm text-gray-500 mt-1">Verify all information before creating the employee record</p>
      </CardHeader>
      <CardContent>
        <dl className="divide-y divide-gray-100">
          {fields.map(({ label, value }) => (
            <div key={label} className="flex justify-between py-3">
              <dt className="text-sm text-gray-500">{label}</dt>
              <dd className="text-sm font-medium text-gray-900">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 rounded-lg bg-green-50 border border-green-200 p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800">Ready to submit</p>
            <p className="text-xs text-green-700 mt-0.5">
              An employee record will be created and an onboarding notification will be sent.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

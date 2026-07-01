"use client";

import { useFormContext } from "react-hook-form";
import type { OnboardingData } from "@/shared/schemas/onboarding";
import { useDepartments } from "@/hooks/use-departments";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";

export function RoleDetailsStep() {
  const { register, formState: { errors } } = useFormContext<OnboardingData>();
  const { data: departments, isLoading } = useDepartments();

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-gray-900">Role & Compensation</h2>
        <p className="text-sm text-gray-500 mt-1">Define the role, department, and salary</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
          <select {...register("departmentId")} className="input-field" disabled={isLoading}>
            <option value="">Select department...</option>
            {departments?.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          {errors.departmentId && <p className="mt-1 text-xs text-red-600">{errors.departmentId.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
            <input {...register("jobTitle")} className="input-field" placeholder="e.g. Senior Engineer" />
            {errors.jobTitle && <p className="mt-1 text-xs text-red-600">{errors.jobTitle.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Salary *</label>
            <input {...register("salaryAmount", { valueAsNumber: true })} type="number" className="input-field" placeholder="e.g. 120000" />
            {errors.salaryAmount && <p className="mt-1 text-xs text-red-600">{errors.salaryAmount.message}</p>}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input {...register("startDate", { valueAsDate: true })} type="date" className="input-field" />
        </div>
      </CardContent>
    </Card>
  );
}

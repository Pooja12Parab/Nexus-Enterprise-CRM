"use client";

import { useFormContext } from "react-hook-form";
import type { OnboardingData } from "@/shared/schemas/onboarding";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import { useDepartments } from "@/hooks/use-departments";
import { Sparkles, CheckCircle } from "lucide-react";
import { useState } from "react";

export function ReviewSignStep() {
  const { getValues, setValue, watch } = useFormContext<OnboardingData>();
  const { data: departments } = useDepartments();
  const values = getValues();
  const welcomeMessage = watch("welcomeMessage" as keyof OnboardingData) as
    | string
    | undefined;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function handleGenerateSummary() {
    if (!values.firstName || !values.lastName || !values.jobTitle || !deptName) {
      setError("Please complete the personal info and role details first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/onboarding-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: values.firstName,
          lastName: values.lastName,
          jobTitle: values.jobTitle,
          department: deptName,
          startDate: values.startDate,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setValue("welcomeMessage" as keyof OnboardingData, data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI summary failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-gray-900">Review & Submit</h2>
        <p className="text-sm text-gray-500 mt-1">
          Verify all information before creating the employee record
        </p>
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

        <div className="mt-6 space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="welcomeMessage"
              className="text-sm font-medium text-gray-700"
            >
              Welcome message (optional)
            </label>
            <button
              type="button"
              onClick={handleGenerateSummary}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-md bg-nexus-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-nexus-600 disabled:opacity-50"
            >
              <Sparkles className="h-3 w-3" />
              {loading ? "Generating…" : welcomeMessage ? "Regenerate" : "Generate with AI"}
            </button>
          </div>
          <textarea
            id="welcomeMessage"
            value={welcomeMessage ?? ""}
            onChange={(e) =>
              setValue("welcomeMessage" as keyof OnboardingData, e.target.value)
            }
            rows={3}
            placeholder="Optional welcome blurb the new hire will receive…"
            className="input-field w-full"
          />
          {error && <div className="text-xs text-red-600">{error}</div>}
        </div>

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

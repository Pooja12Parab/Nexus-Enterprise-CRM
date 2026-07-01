"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Avatar } from "@/components/ui/Avatar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorCard } from "@/components/ui/ErrorCard";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { EmployeeRow } from "@/shared/types";
import { ArrowLeft, Mail, Phone, MapPin, Calendar, DollarSign, Briefcase } from "lucide-react";
import Link from "next/link";

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["employee", id],
    queryFn: async () => {
      const res = await fetch(`/api/employees/${id}`);
      if (!res.ok) throw new Error("Failed to fetch employee");
      const json = await res.json();
      return json.data;
    },
    staleTime: 30_000,
  });

  if (isLoading) return <LoadingSpinner size="lg" label="Loading employee details..." />;

  if (isError) {
    return <ErrorCard message={error?.message || "Failed to load employee"} onRetry={() => refetch()} />;
  }

  if (!data) return <ErrorCard message="Employee not found" />;

  const employee = data;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 rounded-md hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {employee.firstName} {employee.lastName}
          </h1>
          <p className="text-sm text-gray-500">{employee.employeeId}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Profile</h2>
            <StatusBadge status={employee.status} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-6">
            <Avatar firstName={employee.firstName} lastName={employee.lastName} size="lg" />
            <div className="flex-1 grid grid-cols-2 gap-4">
              <DetailItem icon={Briefcase} label="Job Title" value={employee.jobTitle || "—"} />
              <DetailItem icon={MapPin} label="Location" value={employee.location || "—"} />
              <DetailItem icon={Mail} label="Email" value={employee.user.email} />
              <DetailItem icon={Phone} label="Phone" value={employee.phoneNumber || "—"} />
              <DetailItem icon={Calendar} label="Hire Date" value={employee.hireDate ? formatDate(employee.hireDate) : "—"} />
              <DetailItem icon={MapPin} label="Department" value={employee.department?.name || "—"} />
            </div>
          </div>
        </CardContent>
      </Card>

      {employee.salaries && employee.salaries.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold text-gray-900">Compensation History</h2>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-gray-100">
              {employee.salaries.map((salary: { id: string; amount: number; effectiveDate: string; notes?: string }) => (
                <div key={salary.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{formatCurrency(salary.amount)}</p>
                    <p className="text-xs text-gray-500">{salary.notes || "Salary adjustment"}</p>
                  </div>
                  <span className="text-xs text-gray-400">{formatDate(salary.effectiveDate)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Link href="/directory" className="btn-secondary">Back to Directory</Link>
        <button className="btn-primary">Edit Profile</button>
      </div>
    </div>
  );
}

function DetailItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}

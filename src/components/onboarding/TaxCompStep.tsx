"use client";

import { useFormContext } from "react-hook-form";
import type { OnboardingData } from "@/shared/schemas/onboarding";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { FileText, Shield } from "lucide-react";

export function TaxCompStep() {
  const { register, formState: { errors } } = useFormContext<OnboardingData>();

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-gray-900">Tax & Documents</h2>
        <p className="text-sm text-gray-500 mt-1">Tax withholding and compliance documents</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
          <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700">W-4 Tax Withholding Form</p>
          <p className="text-xs text-gray-500 mt-1">Upload or complete digitally</p>
          <button type="button" className="btn-secondary mt-3 text-xs">Upload Document</button>
        </div>

        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
          <Shield className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700">I-9 Employment Verification</p>
          <p className="text-xs text-gray-500 mt-1">Identity and eligibility documents</p>
          <button type="button" className="btn-secondary mt-3 text-xs">Upload Document</button>
        </div>

        <div className="rounded-lg bg-nexus-50 border border-nexus-200 p-4">
          <p className="text-sm text-nexus-800">
            Documents can be uploaded after the employee record is created. You may skip this step for now.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

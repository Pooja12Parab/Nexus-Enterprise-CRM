"use client";

import { useFormContext } from "react-hook-form";
import type { OnboardingData } from "@/shared/schemas/onboarding";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";

export function PersonalInfoStep() {
  const { register, formState: { errors } } = useFormContext<OnboardingData>();

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
        <p className="text-sm text-gray-500 mt-1">Basic details about the new employee</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
            <input {...register("firstName")} className="input-field" placeholder="e.g. John" />
            {errors.firstName && <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
            <input {...register("lastName")} className="input-field" placeholder="e.g. Smith" />
            {errors.lastName && <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input {...register("email")} type="email" className="input-field" placeholder="e.g. john@company.com" />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input {...register("phoneNumber")} className="input-field" placeholder="e.g. +1 555-0123" />
            {errors.phoneNumber && <p className="mt-1 text-xs text-red-600">{errors.phoneNumber.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input {...register("location")} className="input-field" placeholder="e.g. New York" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

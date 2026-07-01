"use client";

import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { onboardingSchema, type OnboardingData } from "@/shared/schemas/onboarding";
import { useOnboardingDraft } from "@/stores/onboarding-draft";
import { Wizard, WizardContent } from "@/components/onboarding/Wizard";
import { WizardStepper } from "@/components/onboarding/WizardStepper";
import { StepNavigation } from "@/components/onboarding/StepNavigation";
import { PersonalInfoStep } from "@/components/onboarding/PersonalInfoStep";
import { RoleDetailsStep } from "@/components/onboarding/RoleDetailsStep";
import { TaxCompStep } from "@/components/onboarding/TaxCompStep";
import { ReviewSignStep } from "@/components/onboarding/ReviewSignStep";
import { SaveDraftButton } from "@/components/onboarding/SaveDraftButton";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function OnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { draft, currentStep, clearDraft, setStep } = useOnboardingDraft();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const methods = useForm<OnboardingData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: draft ?? {
      firstName: "",
      lastName: "",
      departmentId: "",
      jobTitle: "",
      salaryAmount: undefined,
    },
    mode: "onChange",
  });

  const handleSubmit = async () => {
    const isValid = await methods.trigger();
    if (!isValid) return;

    setIsSubmitting(true);
    setServerError(null);

    try {
      const res = await fetch("/api/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(methods.getValues()),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body?.error?.message || "Failed to onboard employee");
      }

      clearDraft();
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      router.push("/directory");
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Onboard New Employee</h1>
          <p className="text-sm text-gray-500 mt-1">Complete all steps to create a new employee record</p>
        </div>
        <FormProvider {...methods}>
          <SaveDraftButton />
        </FormProvider>
      </div>

      {serverError && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4">
          <p className="text-sm text-red-700">{serverError}</p>
        </div>
      )}

      <FormProvider {...methods}>
        <Wizard totalSteps={4} initialStep={currentStep || 0} onStepChange={setStep}>
          <WizardStepper />
          <WizardContent>
            <PersonalInfoStep />
            <RoleDetailsStep />
            <TaxCompStep />
            <ReviewSignStep />
          </WizardContent>
          <StepNavigation onFinalSubmit={handleSubmit} isSubmitting={isSubmitting} />
        </Wizard>
      </FormProvider>
    </div>
  );
}

"use client";

import { useFormContext } from "react-hook-form";
import type { OnboardingData } from "@/shared/schemas/onboarding";
import { useOnboardingDraft } from "@/stores/onboarding-draft";
import { Save } from "lucide-react";

export function SaveDraftButton() {
  const { getValues } = useFormContext<OnboardingData>();
  const { setDraft, setStep } = useOnboardingDraft();

  const handleSave = () => {
    const data = getValues();
    setDraft(data);
    setStep(0);
  };

  return (
    <button
      type="button"
      onClick={handleSave}
      className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
    >
      <Save className="h-4 w-4" />
      Save Draft
    </button>
  );
}

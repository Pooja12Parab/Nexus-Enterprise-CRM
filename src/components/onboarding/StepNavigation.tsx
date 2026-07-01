"use client";

import { useContext } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { WizardContext } from "./Wizard";

interface StepNavigationProps {
  onFinalSubmit?: () => void;
  isSubmitting?: boolean;
  className?: string;
}

export function StepNavigation({ onFinalSubmit, isSubmitting, className }: StepNavigationProps) {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("StepNavigation must be used within a Wizard");
  const { currentStep, totalSteps, goNext, goBack } = ctx;
  const isFirst = currentStep === 0;
  const isLast = currentStep === totalSteps - 1;

  return (
    <div className={cn("flex items-center justify-between pt-6 border-t border-gray-200", className)}>
      <button
        type="button"
        onClick={goBack}
        disabled={isFirst}
        className="btn-secondary inline-flex items-center gap-1 disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
        Back
      </button>

      {isLast ? (
        <button
          type="button"
          onClick={onFinalSubmit}
          disabled={isSubmitting}
          className="btn-primary inline-flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit & Onboard"
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={goNext}
          className="btn-primary inline-flex items-center gap-1"
        >
          Continue
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

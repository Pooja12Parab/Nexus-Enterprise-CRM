"use client";

import { useContext } from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { WizardContext } from "./Wizard";

const stepLabels = ["Personal Info", "Role & Compensation", "Tax & Documents", "Review & Submit"];

export function WizardStepper() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("WizardStepper must be used within a Wizard");
  const { currentStep, totalSteps, goTo } = ctx;

  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-center">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isLast = index === totalSteps - 1;

          return (
            <li key={index} className={cn("flex items-center", !isLast && "flex-1")}>
              <button
                onClick={() => goTo(index)}
                disabled={index > currentStep}
                className={cn(
                  "relative flex items-center justify-center h-8 w-8 rounded-full text-sm font-medium transition-colors",
                  isCompleted && "bg-nexus-500 text-white hover:bg-nexus-600 cursor-pointer",
                  isCurrent && "bg-nexus-500 text-white ring-2 ring-nexus-200 cursor-default",
                  !isCompleted && !isCurrent && "bg-gray-200 text-gray-500 cursor-not-allowed"
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
              </button>
              <span
                className={cn(
                  "ml-2 text-sm font-medium",
                  isCurrent ? "text-nexus-700" : isCompleted ? "text-gray-700" : "text-gray-400"
                )}
              >
                {stepLabels[index]}
              </span>
              {!isLast && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-4",
                    isCompleted ? "bg-nexus-500" : "bg-gray-200"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

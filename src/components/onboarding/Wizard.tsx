"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface WizardContextValue {
  currentStep: number;
  totalSteps: number;
  goNext: () => void;
  goBack: () => void;
  goTo: (step: number) => void;
}

const WizardContext = createContext<WizardContextValue | null>(null);

function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("Wizard components must be used within <Wizard>");
  return ctx;
}

export { WizardContext };

interface WizardProps {
  children: ReactNode;
  totalSteps: number;
  initialStep?: number;
  onStepChange?: (step: number) => void;
}

export function Wizard({ children, totalSteps, initialStep = 0, onStepChange }: WizardProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);

  const goNext = () => {
    const next = Math.min(currentStep + 1, totalSteps - 1);
    setCurrentStep(next);
    onStepChange?.(next);
  };

  const goBack = () => {
    const prev = Math.max(currentStep - 1, 0);
    setCurrentStep(prev);
    onStepChange?.(prev);
  };

  const goTo = (step: number) => {
    const clamped = Math.max(0, Math.min(step, totalSteps - 1));
    setCurrentStep(clamped);
    onStepChange?.(clamped);
  };

  return (
    <WizardContext.Provider value={{ currentStep, totalSteps, goNext, goBack, goTo }}>
      <div className="space-y-6">{children}</div>
    </WizardContext.Provider>
  );
}

export function WizardContent({ children, className }: { children: ReactNode; className?: string }) {
  const { currentStep } = useWizard();
  const steps = Array.isArray(children) ? children : [children];
  return <div className={cn(className)}>{steps[currentStep]}</div>;
}

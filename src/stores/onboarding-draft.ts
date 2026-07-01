import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { OnboardingData } from "@/shared/schemas/onboarding";

interface DraftState {
  draft: Partial<OnboardingData> | null;
  currentStep: number;
  setDraft: (draft: Partial<OnboardingData>) => void;
  setStep: (step: number) => void;
  clearDraft: () => void;
}

export const useOnboardingDraft = create<DraftState>()(
  persist(
    (set) => ({
      draft: null,
      currentStep: 0,
      setDraft: (draft) => set({ draft }),
      setStep: (currentStep) => set({ currentStep }),
      clearDraft: () => set({ draft: null, currentStep: 0 }),
    }),
    {
      name: "nexus-onboarding-draft",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ draft: state.draft, currentStep: state.currentStep }),
    }
  )
);

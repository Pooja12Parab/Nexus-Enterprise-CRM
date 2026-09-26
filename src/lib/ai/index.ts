import { google } from "@ai-sdk/google";
import type { LanguageModel } from "ai";

export const DEFAULT_MODEL_ID = "gemini-3.5-flash-lite";

let _model: LanguageModel | null = null;
let _activeModelId: string = DEFAULT_MODEL_ID;

export function getModel(modelId: string = DEFAULT_MODEL_ID): {
  model: LanguageModel;
  modelId: string;
} {
  if (!_model || modelId !== _activeModelId) {
    _model = google(modelId);
    _activeModelId = modelId;
  }
  return { model: _model!, modelId: _activeModelId };
}

export const AI_FEATURES = ["search", "onboarding", "chat"] as const;
export type AiFeature = (typeof AI_FEATURES)[number];

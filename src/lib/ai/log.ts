import { prisma } from "@/lib/prisma";
import type { AiFeature } from "./index";

export interface UsagePayload {
  userId: string;
  feature: AiFeature;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  durationMs: number;
  errorMessage?: string;
}

export async function logAiUsage(payload: UsagePayload): Promise<void> {
  try {
    await prisma.aiUsageLog.create({
      data: {
        userId: payload.userId,
        feature: payload.feature,
        model: payload.model,
        promptTokens: payload.promptTokens,
        completionTokens: payload.completionTokens,
        totalTokens: payload.totalTokens,
        durationMs: payload.durationMs,
        errorMessage: payload.errorMessage ?? null,
      },
    });
  } catch (err) {
    console.error("[ai/log] failed to write usage log:", err);
  }
}

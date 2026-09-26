import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateText, Output } from "ai";
import { getModel } from "@/lib/ai";
import { logAiUsage } from "@/lib/ai/log";
import { rateLimit } from "@/lib/ai/rate-limit";
import {
  onboardingSummaryInputSchema,
  onboardingSummaryOutputSchema,
} from "@/lib/ai/schemas";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (sessionClaims?.role as string | undefined) ?? "EMPLOYEE";
  if (!["HR_MANAGER", "SUPER_ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rl = rateLimit(`onboarding:${userId}`);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfterMs: rl.retryAfterMs },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = onboardingSummaryInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { firstName, lastName, jobTitle, department, managerName, startDate } =
    parsed.data;

  const start = Date.now();
  try {
    const { output, usage } = await generateText({
      model: getModel().model,
      output: Output.object({ schema: onboardingSummaryOutputSchema }),
      system:
        "You are an HR assistant writing a warm, professional welcome message for a new hire. " +
        "Write exactly 2-3 sentences. Mention the team they'll join and the role. No emojis. No greeting like 'Welcome aboard!'",
      prompt: [
        `New hire: ${firstName} ${lastName}`,
        `Role: ${jobTitle}`,
        `Department: ${department}`,
        managerName ? `Manager: ${managerName}` : null,
        startDate ? `Start date: ${startDate}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    });

    await logAiUsage({
      userId,
      feature: "onboarding",
      model: getModel().modelId,
      promptTokens: usage.inputTokens ?? 0,
      completionTokens: usage.outputTokens ?? 0,
      totalTokens: usage.totalTokens ?? 0,
      durationMs: Date.now() - start,
    });

    return NextResponse.json(output);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/ai/onboarding-summary] error:", err);
    await logAiUsage({
      userId,
      feature: "onboarding",
      model: getModel().modelId,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      durationMs: Date.now() - start,
      errorMessage: message,
    });
    return NextResponse.json(
      { error: "AI summary failed", message },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateText, Output } from "ai";
import { getModel } from "@/lib/ai";
import { logAiUsage } from "@/lib/ai/log";
import { rateLimit } from "@/lib/ai/rate-limit";
import {
  searchInputSchema,
  searchQuerySchema,
  type SearchQuery,
} from "@/lib/ai/schemas";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { userId, sessionClaims } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (sessionClaims?.role as string | undefined) ?? "EMPLOYEE";
  if (!["HR_MANAGER", "SUPER_ADMIN", "DEPT_HEAD"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rl = rateLimit(`search:${userId}`);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfterMs: rl.retryAfterMs },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = searchInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const start = Date.now();
  try {
    const { output, usage } = await generateText({
      model: getModel().model,
      output: Output.object({ schema: searchQuerySchema }),
      system:
        "Translate the user's natural-language query into a structured directory search. " +
        "Use the 'search' field for free-text matching (name, email, job title). " +
        "Use 'dept' for department filter. Use 'status' for employment status. " +
        "Use 'sortBy' and 'sortDir' for ordering. Use 'page' (default 1) and 'limit' (default 50, max 100).",
      prompt: parsed.data.query,
    });

    const filters = output as SearchQuery;
    const where: Record<string, unknown> = {};
    if (filters.dept) where.department = { name: filters.dept };
    if (filters.status) where.status = filters.status;
    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: "insensitive" } },
        { lastName: { contains: filters.search, mode: "insensitive" } },
        { jobTitle: { contains: filters.search, mode: "insensitive" } },
        { email: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const orderBy = filters.sortBy
      ? { [filters.sortBy]: filters.sortDir ?? "asc" }
      : { lastName: "asc" as const };

    const [items, total] = await Promise.all([
      prisma.employeeProfile.findMany({
        where,
        include: { department: { select: { name: true } } },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.employeeProfile.count({ where }),
    ]);

    await logAiUsage({
      userId,
      feature: "search",
      model: getModel().modelId,
      promptTokens: usage.inputTokens ?? 0,
      completionTokens: usage.outputTokens ?? 0,
      totalTokens: usage.totalTokens ?? 0,
      durationMs: Date.now() - start,
    });

    return NextResponse.json({
      filters,
      page,
      limit,
      total,
      items: items.map((e) => ({
        id: e.id,
        firstName: e.firstName,
        lastName: e.lastName,
        jobTitle: e.jobTitle,
        department: e.department.name,
        status: e.status,
        email: null,
        hireDate: e.hireDate,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[api/ai/search] error:", err);
    await logAiUsage({
      userId,
      feature: "search",
      model: getModel().modelId,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      durationMs: Date.now() - start,
      errorMessage: message,
    });
    return NextResponse.json(
      { error: "AI search failed", message },
      { status: 500 }
    );
  }
}

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  toUIMessageStream,
  validateUIMessages,
  type ToolSet,
  type UIMessage,
} from "ai";
import { getModel } from "@/lib/ai";
import { getMcpTools } from "@/lib/mcp/client";
import { logAiUsage } from "@/lib/ai/log";
import { rateLimit } from "@/lib/ai/rate-limit";
import {
  createChatThread,
  ensureThreadAccess,
  loadChatHistory,
  saveChatMessages,
} from "@/lib/ai/chat-store";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rl = rateLimit(`chat:${userId}`, { limit: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = (await req.json().catch(() => ({}))) as {
    messages?: UIMessage[];
    chatId?: string;
  };
  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return new Response(JSON.stringify({ error: "messages required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  let chatId = body.chatId;
  if (!chatId) {
    chatId = await createChatThread(userId);
  } else {
    const allowed = await ensureThreadAccess(chatId, userId);
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const previousMessages = await loadChatHistory(chatId, userId);
  const incoming = body.messages;

  // Tools come from the MCP server — single source of truth shared with external clients
  const tools: ToolSet = await getMcpTools();

  let validatedMessages: UIMessage[];
  try {
    validatedMessages = await validateUIMessages({
      messages: [...previousMessages, ...incoming],
      tools,
    });
  } catch {
    validatedMessages = [...previousMessages, ...incoming];
  }

  const start = Date.now();
  const result = streamText({
    model: getModel().model,
    messages: await convertToModelMessages(validatedMessages),
    system:
      "You are an HR assistant for Nexus Enterprise CRM. Answer questions about employees, " +
      "departments, and the workforce using the provided tools. Be concise, accurate, and cite which tool you used. " +
      "If the tools don't have the answer, say so honestly. Never invent employee names or counts.",
    tools,
    stopWhen: stepCountIs(5),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: validatedMessages,
      onFinish: async ({ messages }) => {
        await saveChatMessages(chatId!, userId, messages);
        const usage = await result.usage;
        await logAiUsage({
          userId,
          feature: "chat",
          model: getModel().modelId,
          promptTokens: usage.inputTokens ?? 0,
          completionTokens: usage.outputTokens ?? 0,
          totalTokens: usage.totalTokens ?? 0,
          durationMs: Date.now() - start,
        });
      },
    }),
  });
}

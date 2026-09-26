import { ChatPanel } from "@/components/ai/ChatPanel";
import { loadChatHistory } from "@/lib/ai/chat-store";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HrAssistantChatPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");
  const { id } = await props.params;
  const messages = await loadChatHistory(id, userId);

  return (
    <div className="mx-auto flex h-[calc(100vh-12rem)] max-w-4xl flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">HR Assistant</h1>
        <p className="text-sm text-gray-500">
          Ask questions about employees, departments, and workforce stats. The assistant uses real
          database queries via tools — answers are grounded in your data.
        </p>
      </div>
      <ChatPanel chatId={id} initialMessages={messages} />
    </div>
  );
}

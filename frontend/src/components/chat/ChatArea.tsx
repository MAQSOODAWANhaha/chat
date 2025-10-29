import { MessageList } from "@/components/chat/MessageList";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { useAppStore } from "@/store/useAppStore";

export function ChatArea() {
  const { getActiveConversation, isLoading } = useAppStore();
  const conversation = getActiveConversation();

  if (!conversation) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2">
        <h2 className="text-lg font-semibold">欢迎使用语言对话平台</h2>
        <p className="max-w-md text-center text-sm text-muted-foreground">
          创建一个新的会话或从列表中选择已有会话，开始与 AI 角色的多语言交流。
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
        <div>
          <p className="text-base font-semibold">{conversation.title || "新对话"}</p>
          <p className="text-xs text-muted-foreground">
            当前角色：{conversation.roleId.toUpperCase()} · 输出语言：{conversation.settings.language.toUpperCase()}
          </p>
        </div>
      </div>
      <MessageList conversation={conversation} />
      {isLoading ? <TypingIndicator /> : null}
    </div>
  );
}

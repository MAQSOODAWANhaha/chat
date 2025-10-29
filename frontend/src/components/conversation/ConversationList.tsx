import { format } from "date-fns";

import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppStore } from "@/store/useAppStore";
import { ConversationItem } from "./ConversationItem";

interface ConversationListProps {
  activeConversationId: string | null;
}

export function ConversationList({ activeConversationId }: ConversationListProps) {
  const { conversations, switchConversation } = useAppStore();

  const sorted = [...conversations].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
  );

  return (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-2 pr-2">
        {sorted.map((conversation) => (
          <ConversationItem
            key={conversation.id}
            id={conversation.id}
            title={conversation.title || "新对话"}
            roleId={conversation.roleId}
            updatedAt={format(conversation.updatedAt, "MM-dd HH:mm")}
            active={conversation.id === activeConversationId}
            onSelect={() => switchConversation(conversation.id)}
          />
        ))}
        {sorted.length === 0 ? (
          <p className="px-2 text-sm text-muted-foreground">暂无会话，点击上方按钮新建</p>
        ) : null}
      </div>
    </ScrollArea>
  );
}

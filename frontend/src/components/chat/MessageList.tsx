import { useEffect, useRef } from "react";

import { MessageBubble } from "@/components/chat/MessageBubble";
import { Conversation } from "@/types/conversation";

interface MessageListProps {
  conversation: Conversation;
}

export function MessageList({ conversation }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation.messages.length]);

  return (
    <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
      {conversation.messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          showText={conversation.settings.showText}
          playAudio={conversation.settings.playAudio}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

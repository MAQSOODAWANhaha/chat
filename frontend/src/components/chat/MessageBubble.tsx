import { AssistantMessage } from "@/components/chat/AssistantMessage";
import { UserMessage } from "@/components/chat/UserMessage";
import { Message } from "@/types/conversation";

interface MessageBubbleProps {
  message: Message;
  showText: boolean;
  playAudio: boolean;
}

export function MessageBubble({ message, showText, playAudio }: MessageBubbleProps) {
  if (message.role === "assistant") {
    return <AssistantMessage message={message} showText={showText} playAudio={playAudio} />;
  }

  if (message.role === "user") {
    return <UserMessage message={message} />;
  }

  return null;
}

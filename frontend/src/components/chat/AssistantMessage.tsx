import { format } from "date-fns";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AudioPlayer } from "@/components/chat/AudioPlayer";
import { Message } from "@/types/conversation";
import { useAppStore } from "@/store/useAppStore";

interface AssistantMessageProps {
  message: Message;
  showText: boolean;
  playAudio: boolean;
}

export function AssistantMessage({ message, showText, playAudio }: AssistantMessageProps) {
  const { getActiveConversation, getRole } = useAppStore();
  const conversation = getActiveConversation();
  const role = conversation ? getRole(conversation.roleId) : null;

  return (
    <div className="flex max-w-[80%] items-start gap-3">
      <Avatar className="mt-1 h-8 w-8">
        <AvatarFallback>{role?.avatar || "🤖"}</AvatarFallback>
      </Avatar>
      <div className="flex flex-1 flex-col gap-2">
        <div className="rounded-2xl bg-card px-4 py-3 text-sm text-foreground shadow">
          {playAudio && message.audioUrl ? (
            <AudioPlayer messageId={message.id} audioUrl={message.audioUrl} />
          ) : null}
          {showText ? <p className="whitespace-pre-wrap">{message.content}</p> : null}
          {!showText && !playAudio ? (
            <p className="text-xs text-muted-foreground">输出已禁用，请在设置中启用文字或语音。</p>
          ) : null}
        </div>
        <span className="text-xs text-muted-foreground">
          {format(message.timestamp, "HH:mm")}
        </span>
      </div>
    </div>
  );
}

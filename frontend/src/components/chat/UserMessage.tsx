import { format } from "date-fns";

import { Message } from "@/types/conversation";

interface UserMessageProps {
  message: Message;
}

export function UserMessage({ message }: UserMessageProps) {
  return (
    <div className="flex justify-end">
      <div className="flex max-w-[70%] flex-col items-end gap-2">
        <div className="rounded-2xl bg-primary px-4 py-3 text-sm text-primary-foreground shadow">
          {message.content}
        </div>
        <span className="text-xs text-muted-foreground">
          {format(message.timestamp, "HH:mm")}
        </span>
      </div>
    </div>
  );
}

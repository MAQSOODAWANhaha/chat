import { KeyboardEvent } from "react";

import { Textarea } from "@/components/ui/textarea";

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function TextInput({ value, onChange, onSubmit }: TextInputProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <Textarea
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={handleKeyDown}
      placeholder="输入消息，按 Enter 发送（Shift + Enter 换行）"
      className="max-h-32 min-h-[60px] flex-1"
    />
  );
}

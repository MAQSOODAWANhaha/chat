import { MouseEventHandler } from "react";
import { SendHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";

interface SendButtonProps {
  disabled?: boolean;
  onClick: MouseEventHandler<HTMLButtonElement>;
}

export function SendButton({ disabled, onClick }: SendButtonProps) {
  return (
    <Button type="submit" size="icon" disabled={disabled} onClick={onClick}>
      <SendHorizontal className="h-5 w-5" />
    </Button>
  );
}

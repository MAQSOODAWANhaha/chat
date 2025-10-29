import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

interface ConversationItemProps {
  id: string;
  title: string;
  roleId: string;
  updatedAt: string;
  active: boolean;
  onSelect: () => void;
}

export function ConversationItem({
  title,
  roleId,
  updatedAt,
  active,
  onSelect,
}: ConversationItemProps) {
  const { getRole } = useAppStore();
  const role = getRole(roleId);

  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex w-full items-center justify-between rounded-xl border border-transparent bg-card px-3 py-3 text-left transition hover:border-primary/60 hover:bg-primary/5",
        active && "border-primary bg-primary/10"
      )}
    >
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground">
          {role?.avatar} {role?.name || "未知角色"}
        </span>
      </div>
      <span className="text-xs text-muted-foreground">{updatedAt}</span>
    </button>
  );
}

import { ROLES } from "@/config/defaults";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";

interface RoleSelectorProps {
  conversationId: string;
  currentRoleId: string;
}

export function RoleSelector({ conversationId, currentRoleId }: RoleSelectorProps) {
  const { updateConversationRole } = useAppStore();

  return (
    <div className="grid gap-3">
      {ROLES.map((role) => (
        <button
          key={role.id}
          className={cn(
            "flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-left shadow-sm transition",
            currentRoleId === role.id && "border-primary bg-primary/10"
          )}
          onClick={() => updateConversationRole(conversationId, role.id)}
        >
          <div>
            <p className="text-sm font-semibold text-foreground">
              {role.avatar} {role.name}
            </p>
            <p className="text-xs text-muted-foreground">{role.description}</p>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {role.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-muted px-2 py-0.5">
                {tag}
              </span>
            ))}
          </div>
        </button>
      ))}
    </div>
  );
}

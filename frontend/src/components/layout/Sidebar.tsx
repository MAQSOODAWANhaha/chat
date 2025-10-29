import { useEffect } from "react";

import { ConversationList } from "@/components/conversation/ConversationList";
import { NewConversationDialog } from "@/components/conversation/NewConversationDialog";
import { Separator } from "@/components/ui/separator";
import { useMobileBreakpoint } from "@/hooks/use-mobile";
import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const isMobile = useMobileBreakpoint();
  const {
    isSidebarOpen,
    toggleSidebar,
    setSidebarOpen,
    conversations,
    activeConversationId,
  } = useAppStore();

  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    } else {
      setSidebarOpen(true);
    }
  }, [isMobile, setSidebarOpen]);

  const sidebarContent = (
    <aside className="flex h-full w-full flex-col gap-4 overflow-hidden bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-base font-semibold">会话列表</p>
          <p className="text-xs text-muted-foreground">
            当前共有 {conversations.length} 个会话
          </p>
        </div>
        <NewConversationDialog />
      </div>
      <Separator />
      <ConversationList
        activeConversationId={activeConversationId}
        onConversationSelect={isMobile ? () => setSidebarOpen(false) : undefined}
      />
    </aside>
  );

  if (isMobile) {
    return (
      <>
        <div
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-full max-w-[85vw] sm:max-w-sm transform bg-card shadow-lg transition-transform duration-200",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {sidebarContent}
        </div>
        {isSidebarOpen ? (
          <div
            className="fixed inset-0 z-30 bg-black/40"
            onClick={toggleSidebar}
            role="presentation"
          />
        ) : null}
      </>
    );
  }

  return <div className="hidden w-80 border-r border-border lg:flex">{sidebarContent}</div>;
}

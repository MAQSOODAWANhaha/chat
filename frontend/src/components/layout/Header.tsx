import { Menu } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useMobileBreakpoint } from "@/hooks/use-mobile";
import { useAppStore } from "@/store/useAppStore";

export function Header() {
  const isMobile = useMobileBreakpoint();
  const { toggleSidebar, isLoading } = useAppStore();

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-3">
        {isMobile ? (
          <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Toggle sidebar">
            <Menu className="h-5 w-5" />
          </Button>
        ) : null}
        <div>
          <p className="text-lg font-semibold">语言对话平台</p>
          <p className="text-sm text-muted-foreground">
            多角色多语言的实时 AI 对话体验
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {isLoading ? <span className="text-sm text-muted-foreground">处理中...</span> : null}
      </div>
    </header>
  );
}

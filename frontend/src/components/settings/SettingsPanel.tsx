import { X } from "lucide-react";

import { LanguageSelector } from "@/components/settings/LanguageSelector";
import { OutputToggle } from "@/components/settings/OutputToggle";
import { RoleSelector } from "@/components/conversation/RoleSelector";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAppStore } from "@/store/useAppStore";

export function SettingsPanel() {
  const {
    getActiveConversation,
    updateConversationSettings,
    toggleSettings,
  } = useAppStore();

  const conversation = getActiveConversation();

  if (!conversation) {
    return null;
  }

  const handleLanguageChange = (language: "en" | "zh") => {
    updateConversationSettings(conversation.id, { language });
  };

  const handleShowTextChange = (value: boolean) => {
    updateConversationSettings(conversation.id, { showText: value });
  };

  const handlePlayAudioChange = (value: boolean) => {
    updateConversationSettings(conversation.id, { playAudio: value });
  };

  return (
    <aside className="fixed inset-y-0 right-0 z-50 w-80 border-l border-border bg-card shadow-xl">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <p className="text-sm font-semibold">会话设置</p>
          <p className="text-xs text-muted-foreground">为当前会话定制输出与角色</p>
        </div>
        <Button variant="ghost" size="icon" onClick={toggleSettings} aria-label="关闭设置">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-6 overflow-y-auto px-5 py-6">
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">输出设置</h3>
          <LanguageSelector value={conversation.settings.language} onChange={handleLanguageChange} />
          <OutputToggle
            label="显示文字"
            description="关闭后仅播放语音"
            value={conversation.settings.showText}
            onChange={handleShowTextChange}
          />
          <OutputToggle
            label="播放语音"
            description="关闭后仅显示文字"
            value={conversation.settings.playAudio}
            onChange={handlePlayAudioChange}
          />
        </section>
        <Separator />
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">切换角色</h3>
          <RoleSelector conversationId={conversation.id} currentRoleId={conversation.roleId} />
        </section>
      </div>
    </aside>
  );
}

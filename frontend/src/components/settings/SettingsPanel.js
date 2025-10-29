import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { X } from "lucide-react";
import { LanguageSelector } from "@/components/settings/LanguageSelector";
import { OutputToggle } from "@/components/settings/OutputToggle";
import { RoleSelector } from "@/components/conversation/RoleSelector";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAppStore } from "@/store/useAppStore";
export function SettingsPanel() {
    const { getActiveConversation, updateConversationSettings, toggleSettings, draftSettings, draftRoleId, setDraftRole, setDraftSettings, } = useAppStore();
    const conversation = getActiveConversation();
    const isDefaultConfig = !conversation;
    const currentSettings = conversation?.settings ?? draftSettings;
    const currentRoleId = conversation?.roleId ?? draftRoleId;
    const handleLanguageChange = (language) => {
        if (conversation) {
            updateConversationSettings(conversation.id, { language });
        }
        else {
            setDraftSettings({ language });
        }
    };
    const handleShowTextChange = (value) => {
        if (conversation) {
            updateConversationSettings(conversation.id, { showText: value });
        }
        else {
            setDraftSettings({ showText: value });
        }
    };
    const handlePlayAudioChange = (value) => {
        if (conversation) {
            updateConversationSettings(conversation.id, { playAudio: value });
        }
        else {
            setDraftSettings({ playAudio: value });
        }
    };
    return (_jsxs("aside", { className: "fixed inset-y-0 right-0 z-50 w-80 border-l border-border bg-card shadow-xl", children: [_jsxs("div", { className: "flex items-center justify-between border-b border-border px-5 py-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-semibold", children: isDefaultConfig ? "默认设置" : "会话设置" }), _jsx("p", { className: "text-xs text-muted-foreground", children: isDefaultConfig ? "配置首次会话的默认语言与角色" : "为当前会话定制输出与角色" })] }), _jsx(Button, { variant: "ghost", size: "icon", onClick: toggleSettings, "aria-label": "\u5173\u95ED\u8BBE\u7F6E", children: _jsx(X, { className: "h-4 w-4" }) })] }), _jsxs("div", { className: "space-y-6 overflow-y-auto px-5 py-6", children: [_jsxs("section", { className: "space-y-3", children: [_jsx("h3", { className: "text-sm font-semibold text-foreground", children: "\u8F93\u51FA\u8BBE\u7F6E" }), _jsx(LanguageSelector, { value: currentSettings.language, onChange: handleLanguageChange }), _jsx(OutputToggle, { label: "\u663E\u793A\u6587\u5B57", description: "\u5173\u95ED\u540E\u4EC5\u64AD\u653E\u8BED\u97F3", value: currentSettings.showText, onChange: handleShowTextChange }), _jsx(OutputToggle, { label: "\u64AD\u653E\u8BED\u97F3", description: "\u5173\u95ED\u540E\u4EC5\u663E\u793A\u6587\u5B57", value: currentSettings.playAudio, onChange: handlePlayAudioChange })] }), _jsx(Separator, {}), _jsxs("section", { className: "space-y-3", children: [_jsx("h3", { className: "text-sm font-semibold text-foreground", children: "\u5207\u6362\u89D2\u8272" }), _jsx(RoleSelector, { conversationId: conversation?.id, currentRoleId: currentRoleId, onSelectRole: isDefaultConfig ? setDraftRole : undefined })] })] })] }));
}

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ROLES } from "@/config/defaults";
import { useAppStore } from "@/store/useAppStore";
import { useMobileBreakpoint } from "@/hooks/use-mobile";
export function NewConversationDialog() {
    const [open, setOpen] = useState(false);
    const [roleId, setRoleId] = useState("general");
    const [showText, setShowText] = useState(true);
    const [playAudio, setPlayAudio] = useState(true);
    const [language, setLanguage] = useState("en");
    const { createConversation, draftRoleId, draftSettings, setDraftRole, setDraftSettings, setSidebarOpen, } = useAppStore();
    const isMobile = useMobileBreakpoint();
    useEffect(() => {
        if (open) {
            setRoleId(draftRoleId);
            setShowText(draftSettings.showText);
            setPlayAudio(draftSettings.playAudio);
            setLanguage(draftSettings.language);
        }
    }, [open, draftRoleId, draftSettings]);
    const handleCreate = () => {
        createConversation(roleId, {
            language,
            showText,
            playAudio,
        });
        setDraftRole(roleId);
        setDraftSettings({ language, showText, playAudio });
        setOpen(false);
        if (isMobile) {
            setSidebarOpen(false);
        }
    };
    return (_jsxs(Dialog, { open: open, onOpenChange: setOpen, children: [_jsx(DialogTrigger, { asChild: true, children: _jsx(Button, { size: "sm", variant: "secondary", children: "\u65B0\u5EFA" }) }), _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "\u65B0\u5EFA\u5BF9\u8BDD" }), _jsx(DialogDescription, { children: "\u9009\u62E9\u89D2\u8272\u5E76\u914D\u7F6E\u8F93\u51FA\u504F\u597D" })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "role", children: "\u89D2\u8272" }), _jsxs(Select, { value: roleId, onValueChange: setRoleId, children: [_jsx(SelectTrigger, { id: "role", children: _jsx(SelectValue, { placeholder: "\u9009\u62E9\u89D2\u8272" }) }), _jsx(SelectContent, { children: ROLES.map((role) => (_jsxs(SelectItem, { value: role.id, children: [role.avatar, " ", role.name] }, role.id))) })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "language", children: "\u8F93\u51FA\u8BED\u8A00" }), _jsxs(Select, { value: language, onValueChange: (value) => setLanguage(value), children: [_jsx(SelectTrigger, { id: "language", children: _jsx(SelectValue, { placeholder: "\u9009\u62E9\u8BED\u8A00" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "en", children: "\u82F1\u8BED" }), _jsx(SelectItem, { value: "zh", children: "\u4E2D\u6587" })] })] })] }), _jsxs("div", { className: "flex items-center justify-between rounded-lg border border-border p-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium", children: "\u663E\u793A\u6587\u5B57" }), _jsx("p", { className: "text-xs text-muted-foreground", children: "\u5173\u95ED\u540E\u4EC5\u64AD\u653E\u8BED\u97F3" })] }), _jsx(Switch, { checked: showText, onCheckedChange: setShowText })] }), _jsxs("div", { className: "flex items-center justify-between rounded-lg border border-border p-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium", children: "\u64AD\u653E\u8BED\u97F3" }), _jsx("p", { className: "text-xs text-muted-foreground", children: "\u5173\u95ED\u540E\u4EC5\u663E\u793A\u6587\u5B57" })] }), _jsx(Switch, { checked: playAudio, onCheckedChange: setPlayAudio })] }), _jsx(Button, { className: "w-full", onClick: handleCreate, children: "\u521B\u5EFA" })] })] })] }));
}

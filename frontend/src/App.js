import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
import { ChatArea } from "@/components/chat/ChatArea";
import { InputArea } from "@/components/input/InputArea";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAppStore } from "@/store/useAppStore";
export function App() {
    const { conversations, setSettingsOpen } = useAppStore();
    const hasOpenedDefaults = useRef(false);
    useEffect(() => {
        if (conversations.length === 0 && !hasOpenedDefaults.current) {
            setSettingsOpen(true);
            hasOpenedDefaults.current = true;
        }
    }, [conversations.length, setSettingsOpen]);
    return (_jsxs(MainLayout, { children: [_jsx(ChatArea, {}), _jsx(InputArea, {})] }));
}
export default App;

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { ToastContainer } from "@/components/ui/toast-container";
import { useAppStore } from "@/store/useAppStore";
export function MainLayout({ children }) {
    const { isSettingsOpen } = useAppStore();
    return (_jsxs("div", { className: "flex h-screen w-full bg-background", children: [_jsx(Sidebar, {}), _jsxs("div", { className: "flex flex-1 flex-col overflow-hidden", children: [_jsx(Header, {}), _jsx("main", { className: "flex flex-1 flex-col overflow-hidden bg-muted/40", children: children })] }), isSettingsOpen ? _jsx(SettingsPanel, {}) : null, _jsx(ToastContainer, {})] }));
}

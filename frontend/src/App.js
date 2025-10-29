import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ChatArea } from "@/components/chat/ChatArea";
import { InputArea } from "@/components/input/InputArea";
import { MainLayout } from "@/components/layout/MainLayout";
export function App() {
    return (_jsxs(MainLayout, { children: [_jsx(ChatArea, {}), _jsx(InputArea, {})] }));
}
export default App;

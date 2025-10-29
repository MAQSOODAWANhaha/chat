import { jsx as _jsx } from "react/jsx-runtime";
import { SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
export function SendButton({ disabled, onClick }) {
    return (_jsx(Button, { type: "submit", size: "icon", disabled: disabled, onClick: onClick, children: _jsx(SendHorizontal, { className: "h-5 w-5" }) }));
}

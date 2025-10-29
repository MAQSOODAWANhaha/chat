import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { format } from "date-fns";
export function UserMessage({ message }) {
    return (_jsx("div", { className: "flex justify-end", children: _jsxs("div", { className: "flex max-w-[70%] flex-col items-end gap-2", children: [_jsx("div", { className: "rounded-2xl bg-primary px-4 py-3 text-sm text-primary-foreground shadow", children: message.content }), _jsx("span", { className: "text-xs text-muted-foreground", children: format(message.timestamp, "HH:mm") })] }) }));
}

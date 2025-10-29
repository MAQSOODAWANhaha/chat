import { jsx as _jsx } from "react/jsx-runtime";
import { Textarea } from "@/components/ui/textarea";
export function TextInput({ value, onChange, onSubmit }) {
    const handleKeyDown = (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            onSubmit();
        }
    };
    return (_jsx(Textarea, { value: value, onChange: (event) => onChange(event.target.value), onKeyDown: handleKeyDown, placeholder: "\u8F93\u5165\u6D88\u606F\uFF0C\u6309 Enter \u53D1\u9001\uFF08Shift + Enter \u6362\u884C\uFF09", className: "max-h-32 min-h-[60px] flex-1" }));
}

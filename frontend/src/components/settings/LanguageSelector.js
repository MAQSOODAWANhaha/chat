import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "@/components/ui/select";
export function LanguageSelector({ value, onChange }) {
    return (_jsxs("div", { className: "space-y-2", children: [_jsx(Label, { htmlFor: "language-select", children: "\u8F93\u51FA\u8BED\u8A00" }), _jsxs(Select, { value: value, onValueChange: (language) => onChange(language), children: [_jsx(SelectTrigger, { id: "language-select", children: _jsx(SelectValue, { placeholder: "\u9009\u62E9\u8F93\u51FA\u8BED\u8A00" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "en", children: "\u82F1\u8BED" }), _jsx(SelectItem, { value: "zh", children: "\u4E2D\u6587" })] })] })] }));
}

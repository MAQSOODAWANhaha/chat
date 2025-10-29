import { jsx as _jsx } from "react/jsx-runtime";
import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";
const Label = React.forwardRef(({ className, ...props }, ref) => (_jsx(LabelPrimitive.Root, { ref: ref, className: cn("text-sm font-medium text-foreground", className), ...props })));
Label.displayName = LabelPrimitive.Root.displayName;
export { Label };

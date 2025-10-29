import { jsx as _jsx } from "react/jsx-runtime";
import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipContent = React.forwardRef(({ className, sideOffset = 4, ...props }, ref) => (_jsx(TooltipPrimitive.Content, { ref: ref, sideOffset: sideOffset, className: `z-50 overflow-hidden rounded-md bg-foreground px-3 py-1.5 text-xs text-background shadow-md ${className ?? ""}`, ...props })));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface LanguageSelectorProps {
  value: "en" | "zh";
  onChange: (value: "en" | "zh") => void;
}

export function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="language-select">输出语言</Label>
      <Select value={value} onValueChange={(language) => onChange(language as "en" | "zh") }>
        <SelectTrigger id="language-select">
          <SelectValue placeholder="选择输出语言" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">英语</SelectItem>
          <SelectItem value="zh">中文</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

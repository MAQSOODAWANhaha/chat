import { Switch } from "@/components/ui/switch";

interface OutputToggleProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export function OutputToggle({ label, description, value, onChange }: OutputToggleProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-background/80 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

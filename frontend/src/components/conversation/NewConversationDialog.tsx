import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_OUTPUT_SETTINGS, ROLES } from "@/config/defaults";
import { useAppStore } from "@/store/useAppStore";

export function NewConversationDialog() {
  const [open, setOpen] = useState(false);
  const [roleId, setRoleId] = useState<string>("general");
  const [showText, setShowText] = useState(DEFAULT_OUTPUT_SETTINGS.showText);
  const [playAudio, setPlayAudio] = useState(DEFAULT_OUTPUT_SETTINGS.playAudio);
  const [language, setLanguage] = useState(DEFAULT_OUTPUT_SETTINGS.language);
  const { createConversation } = useAppStore();

  const handleCreate = () => {
    createConversation(roleId, {
      language,
      showText,
      playAudio,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          新建
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新建对话</DialogTitle>
          <DialogDescription>选择角色并配置输出偏好</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role">角色</Label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger id="role">
                <SelectValue placeholder="选择角色" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.avatar} {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="language">输出语言</Label>
            <Select value={language} onValueChange={(value) => setLanguage(value as "en" | "zh") }>
              <SelectTrigger id="language">
                <SelectValue placeholder="选择语言" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">英语</SelectItem>
                <SelectItem value="zh">中文</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">显示文字</p>
              <p className="text-xs text-muted-foreground">关闭后仅播放语音</p>
            </div>
            <Switch checked={showText} onCheckedChange={setShowText} />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">播放语音</p>
              <p className="text-xs text-muted-foreground">关闭后仅显示文字</p>
            </div>
            <Switch checked={playAudio} onCheckedChange={setPlayAudio} />
          </div>
          <Button className="w-full" onClick={handleCreate}>
            创建
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
